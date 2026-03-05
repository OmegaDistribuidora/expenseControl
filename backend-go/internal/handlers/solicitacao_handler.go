package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	api "github.com/OmegaDistribuidora/expenseControl/backend-go/internal/api"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/audit"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/config"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/permissions"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/storage"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/store"
	"github.com/go-chi/chi/v5"
)

type SolicitacaoHandler struct {
	store   *store.PostgresStore
	storage *storage.LocalAttachments
}

func NewSolicitacaoHandler(cfg config.Config, store *store.PostgresStore) *SolicitacaoHandler {
	return &SolicitacaoHandler{
		store:   store,
		storage: storage.NewLocalAttachments(cfg.AttachmentsLocalRoot),
	}
}

func (h *SolicitacaoHandler) ListFilial(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaFilial {
		api.WriteError(w, r, http.StatusForbidden, "Apenas FILIAL pode acessar este recurso.")
		return
	}
	filial := strings.TrimSpace(conta.Filial)
	if filial == "" {
		api.WriteError(w, r, http.StatusBadRequest, "Conta FILIAL sem filial definida.")
		return
	}

	page := parseIntDefault(r.URL.Query().Get("page"), 0)
	size := parseIntDefault(r.URL.Query().Get("size"), 20)
	sort := r.URL.Query().Get("sort")
	query := r.URL.Query().Get("q")

	resp, err := h.store.ListSolicitacoesFilial(r.Context(), filial, page, size, sort, query)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao carregar solicitacoes.")
		return
	}
	api.WriteJSON(w, http.StatusOK, resp)
}

func (h *SolicitacaoHandler) GetFilial(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaFilial {
		api.WriteError(w, r, http.StatusForbidden, "Apenas FILIAL pode acessar este recurso.")
		return
	}
	id, err := parseIDParam(r, "id")
	if err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "ID invalido.")
		return
	}
	item, err := h.store.GetSolicitacaoByID(r.Context(), id)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao carregar solicitacao.")
		return
	}
	if item == nil {
		api.WriteError(w, r, http.StatusNotFound, "Solicitacao nao encontrada.")
		return
	}
	if !strings.EqualFold(strings.TrimSpace(item.Filial), strings.TrimSpace(conta.Filial)) {
		api.WriteError(w, r, http.StatusForbidden, "Solicitacao nao pertence a filial.")
		return
	}
	api.WriteJSON(w, http.StatusOK, item)
}

func (h *SolicitacaoHandler) CreateFilial(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaFilial {
		api.WriteError(w, r, http.StatusForbidden, "Apenas FILIAL pode acessar este recurso.")
		return
	}
	if strings.TrimSpace(conta.Filial) == "" {
		api.WriteError(w, r, http.StatusBadRequest, "Conta FILIAL sem filial definida.")
		return
	}

	var req domain.SolicitacaoCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "JSON invalido.")
		return
	}
	if msg := domain.ValidateSolicitacaoCreate(req); msg != "" {
		api.WriteError(w, r, http.StatusBadRequest, msg)
		return
	}

	item, err := h.store.CreateSolicitacao(r.Context(), conta, req)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrCategoriaInvalida):
			api.WriteError(w, r, http.StatusBadRequest, "Categoria inativa ou nao encontrada.")
		default:
			api.WriteError(w, r, http.StatusInternalServerError, "Erro ao criar solicitacao.")
		}
		return
	}
	h.logSolicitacaoAudit(r, conta, "SOLICITACAO_CRIADA", item)
	api.WriteJSON(w, http.StatusCreated, item)
}

func (h *SolicitacaoHandler) ReenvioFilial(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaFilial {
		api.WriteError(w, r, http.StatusForbidden, "Apenas FILIAL pode acessar este recurso.")
		return
	}
	id, err := parseIDParam(r, "id")
	if err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "ID invalido.")
		return
	}

	var req domain.SolicitacaoReenvioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "JSON invalido.")
		return
	}
	if msg := domain.ValidateSolicitacaoCreate(req.Dados); msg != "" {
		api.WriteError(w, r, http.StatusBadRequest, msg)
		return
	}

	item, err := h.store.ReenviarSolicitacao(r.Context(), conta, id, req)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrSolicitacaoNaoEncontrada):
			api.WriteError(w, r, http.StatusNotFound, "Solicitacao nao encontrada.")
		case errors.Is(err, store.ErrSolicitacaoSemPermissao):
			api.WriteError(w, r, http.StatusForbidden, "Solicitacao nao pertence a filial.")
		case errors.Is(err, store.ErrSolicitacaoStatusInvalido):
			api.WriteError(w, r, http.StatusConflict, "Solicitacao nao esta aguardando informacoes.")
		case errors.Is(err, store.ErrCategoriaInvalida):
			api.WriteError(w, r, http.StatusBadRequest, "Categoria inativa ou nao encontrada.")
		default:
			api.WriteError(w, r, http.StatusInternalServerError, "Erro ao reenviar solicitacao.")
		}
		return
	}
	h.logSolicitacaoAudit(r, conta, "SOLICITACAO_REENVIADA", item)
	api.WriteJSON(w, http.StatusOK, item)
}

func (h *SolicitacaoHandler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaAdmin {
		api.WriteError(w, r, http.StatusForbidden, "Apenas ADMIN pode acessar este recurso.")
		return
	}
	statusParam := strings.TrimSpace(r.URL.Query().Get("status"))
	var status *domain.StatusSolicitacao
	if statusParam != "" && !strings.EqualFold(statusParam, "TODOS") {
		parsed, ok := parseStatus(statusParam)
		if !ok {
			api.WriteError(w, r, http.StatusBadRequest, "Status invalido. Use PENDENTE, PENDENTE_INFO, APROVADO ou REPROVADO.")
			return
		}
		status = &parsed
	}

	page := parseIntDefault(r.URL.Query().Get("page"), 0)
	size := parseIntDefault(r.URL.Query().Get("size"), 20)
	sort := r.URL.Query().Get("sort")
	query := r.URL.Query().Get("q")

	resp, err := h.store.ListSolicitacoesAdmin(
		r.Context(),
		status,
		permissions.VisibleFiliaisList(conta),
		permissions.IsRootAdmin(conta),
		page,
		size,
		sort,
		query,
	)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao carregar solicitacoes.")
		return
	}
	api.WriteJSON(w, http.StatusOK, resp)
}

func (h *SolicitacaoHandler) StatsAdmin(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaAdmin {
		api.WriteError(w, r, http.StatusForbidden, "Apenas ADMIN pode acessar este recurso.")
		return
	}
	stats, err := h.store.LoadStats(r.Context(), permissions.VisibleFiliaisList(conta), permissions.IsRootAdmin(conta))
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao carregar estatisticas.")
		return
	}
	api.WriteJSON(w, http.StatusOK, stats)
}

type pedidoInfoRequest struct {
	Comentario string `json:"comentario"`
}

type decisaoRequest struct {
	Decisao       string   `json:"decisao"`
	ValorAprovado *float64 `json:"valorAprovado"`
	Comentario    *string  `json:"comentario"`
}

func (h *SolicitacaoHandler) PedidoInfoAdmin(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaAdmin {
		api.WriteError(w, r, http.StatusForbidden, "Apenas ADMIN pode acessar este recurso.")
		return
	}
	if !permissions.CanApproveSolicitacao(conta) {
		api.WriteError(w, r, http.StatusForbidden, "Usuario sem permissao para aprovar ou solicitar revisao.")
		return
	}
	id, err := parseIDParam(r, "id")
	if err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "ID invalido.")
		return
	}

	var body pedidoInfoRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "JSON invalido.")
		return
	}
	if strings.TrimSpace(body.Comentario) == "" {
		api.WriteError(w, r, http.StatusBadRequest, "comentario obrigatorio.")
		return
	}
	if len(strings.TrimSpace(body.Comentario)) > 500 {
		api.WriteError(w, r, http.StatusBadRequest, "comentario deve ter no maximo 500 caracteres.")
		return
	}

	item, err := h.store.PedirInfoSolicitacao(r.Context(), conta, id, store.PedidoInfoInput{Comentario: body.Comentario})
	if err != nil {
		switch {
		case errors.Is(err, store.ErrSolicitacaoNaoEncontrada):
			api.WriteError(w, r, http.StatusNotFound, "Solicitacao nao encontrada.")
		case errors.Is(err, store.ErrSolicitacaoSemPermissao):
			api.WriteError(w, r, http.StatusForbidden, "Sem permissao para visualizar esta solicitacao.")
		case errors.Is(err, store.ErrSolicitacaoStatusInvalido):
			api.WriteError(w, r, http.StatusConflict, "Solicitacao nao esta pendente.")
		default:
			api.WriteError(w, r, http.StatusInternalServerError, "Erro ao pedir ajuste.")
		}
		return
	}
	h.logSolicitacaoAudit(r, conta, "SOLICITACAO_PEDIDO_AJUSTE", item)
	api.WriteJSON(w, http.StatusOK, item)
}

func (h *SolicitacaoHandler) DecisaoAdmin(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaAdmin {
		api.WriteError(w, r, http.StatusForbidden, "Apenas ADMIN pode acessar este recurso.")
		return
	}
	if !permissions.CanApproveSolicitacao(conta) {
		api.WriteError(w, r, http.StatusForbidden, "Usuario sem permissao para aprovar ou solicitar revisao.")
		return
	}
	id, err := parseIDParam(r, "id")
	if err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "ID invalido.")
		return
	}

	var body decisaoRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "JSON invalido.")
		return
	}
	decisao := strings.ToUpper(strings.TrimSpace(body.Decisao))
	if decisao != "APROVADO" && decisao != "REPROVADO" {
		api.WriteError(w, r, http.StatusBadRequest, "Decisao invalida. Use APROVADO ou REPROVADO.")
		return
	}
	if body.Comentario != nil && len(strings.TrimSpace(*body.Comentario)) > 500 {
		api.WriteError(w, r, http.StatusBadRequest, "comentario deve ter no maximo 500 caracteres.")
		return
	}
	if decisao == "APROVADO" && body.ValorAprovado != nil && *body.ValorAprovado <= 0 {
		api.WriteError(w, r, http.StatusBadRequest, "valorAprovado deve ser maior que zero.")
		return
	}

	item, err := h.store.DecidirSolicitacao(r.Context(), conta, id, store.DecisaoInput{
		Decisao:       decisao,
		ValorAprovado: body.ValorAprovado,
		Comentario:    body.Comentario,
	})
	if err != nil {
		switch {
		case errors.Is(err, store.ErrSolicitacaoNaoEncontrada):
			api.WriteError(w, r, http.StatusNotFound, "Solicitacao nao encontrada.")
		case errors.Is(err, store.ErrSolicitacaoSemPermissao):
			api.WriteError(w, r, http.StatusForbidden, "Sem permissao para visualizar esta solicitacao.")
		case errors.Is(err, store.ErrSolicitacaoStatusInvalido):
			api.WriteError(w, r, http.StatusConflict, "Solicitacao nao esta pendente.")
		case errors.Is(err, store.ErrDecisaoInvalida):
			api.WriteError(w, r, http.StatusBadRequest, "Decisao invalida. Use APROVADO ou REPROVADO.")
		default:
			api.WriteError(w, r, http.StatusInternalServerError, "Erro ao decidir solicitacao.")
		}
		return
	}
	if strings.EqualFold(decisao, "APROVADO") {
		h.logSolicitacaoAudit(r, conta, "SOLICITACAO_APROVADA", item)
	} else {
		h.logSolicitacaoAudit(r, conta, "SOLICITACAO_REPROVADA", item)
	}
	api.WriteJSON(w, http.StatusOK, item)
}

func (h *SolicitacaoHandler) ExcluirAdmin(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaAdmin {
		api.WriteError(w, r, http.StatusForbidden, "Apenas ADMIN pode acessar este recurso.")
		return
	}
	if !permissions.CanApproveSolicitacao(conta) {
		api.WriteError(w, r, http.StatusForbidden, "Usuario sem permissao para aprovar ou solicitar revisao.")
		return
	}
	id, err := parseIDParam(r, "id")
	if err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "ID invalido.")
		return
	}
	// Snapshot para auditoria antes de excluir.
	snapshot, _ := h.store.GetSolicitacaoByID(r.Context(), id)
	attachments, _ := h.store.ListAttachmentsBySolicitacao(r.Context(), id)
	for _, anexo := range attachments {
		_ = h.storage.DeleteFile(anexo.DriveFileID)
	}
	if err := h.store.ExcluirSolicitacao(r.Context(), conta, id); err != nil {
		switch {
		case errors.Is(err, store.ErrSolicitacaoNaoEncontrada):
			api.WriteError(w, r, http.StatusNotFound, "Solicitacao nao encontrada.")
		case errors.Is(err, store.ErrSolicitacaoSemPermissao):
			api.WriteError(w, r, http.StatusForbidden, "Sem permissao para visualizar esta solicitacao.")
		default:
			api.WriteError(w, r, http.StatusInternalServerError, "Erro ao excluir solicitacao.")
		}
		return
	}
	if snapshot != nil {
		h.logSolicitacaoAuditWithAttachments(r, conta, "SOLICITACAO_EXCLUIDA", snapshot, attachments)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *SolicitacaoHandler) logSolicitacaoAudit(r *http.Request, conta *domain.Conta, acao string, item *domain.Solicitacao) {
	attachments, _ := h.store.ListAttachmentsBySolicitacao(r.Context(), item.ID)
	h.logSolicitacaoAuditWithAttachments(r, conta, acao, item, attachments)
}

func (h *SolicitacaoHandler) logSolicitacaoAuditWithAttachments(r *http.Request, conta *domain.Conta, acao string, item *domain.Solicitacao, attachments []domain.Attachment) {
	if conta == nil || item == nil {
		return
	}
	referenciaTipo := "SOLICITACAO"
	referenciaID := strconv.FormatInt(item.ID, 10)
	detalhe := audit.SolicitacaoResumo(item)
	detalheCompleto := audit.SolicitacaoDetalheCompleto(acao, item, attachments)
	_ = h.store.RegistrarAuditoria(r.Context(), store.AuditoriaInput{
		Usuario:         conta.Usuario,
		TipoConta:       string(conta.Tipo),
		Acao:            acao,
		ReferenciaTipo:  &referenciaTipo,
		ReferenciaID:    &referenciaID,
		Detalhe:         detalhe,
		DetalheCompleto: &detalheCompleto,
	})
}

func parseIDParam(r *http.Request, key string) (int64, error) {
	return strconv.ParseInt(chi.URLParam(r, key), 10, 64)
}

func parseIntDefault(value string, fallback int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return fallback
	}
	return parsed
}

func parseStatus(value string) (domain.StatusSolicitacao, bool) {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case string(domain.StatusPendente):
		return domain.StatusPendente, true
	case string(domain.StatusPendenteInfo):
		return domain.StatusPendenteInfo, true
	case string(domain.StatusAprovado):
		return domain.StatusAprovado, true
	case string(domain.StatusReprovado):
		return domain.StatusReprovado, true
	default:
		return "", false
	}
}
