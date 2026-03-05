package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	api "github.com/OmegaDistribuidora/expenseControl/backend-go/internal/api"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/permissions"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/store"
	"github.com/go-chi/chi/v5"
)

type AdminHandler struct {
	store *store.PostgresStore
}

func NewAdminHandler(store *store.PostgresStore) *AdminHandler {
	return &AdminHandler{store: store}
}

func (h *AdminHandler) ListContas(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaAdmin {
		api.WriteError(w, r, http.StatusForbidden, "Apenas ADMIN pode acessar este recurso.")
		return
	}

	items, err := h.store.ListContasResumo(r.Context())
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao carregar usuarios.")
		return
	}

	for idx := range items {
		row := items[idx]
		model := &domain.Conta{
			Usuario:                row.Usuario,
			Tipo:                   domain.TipoConta(row.Tipo),
			PodeAprovarSolicitacao: row.PodeAprovarSolicitacao,
			FiliaisVisiveis:        joinFiliais(row.FiliaisVisiveis),
		}
		items[idx].PodeAprovarSolicitacao = permissions.CanApproveSolicitacao(model)
		items[idx].SuperAdmin = permissions.IsRootAdmin(model)
		items[idx].FiliaisVisiveis = permissions.VisibleFiliaisList(model)
	}

	api.WriteJSON(w, http.StatusOK, items)
}

func (h *AdminHandler) ListFiliais(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaAdmin {
		api.WriteError(w, r, http.StatusForbidden, "Apenas ADMIN pode acessar este recurso.")
		return
	}
	items, err := h.store.ListFiliaisDisponiveis(r.Context())
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao carregar filiais.")
		return
	}
	api.WriteJSON(w, http.StatusOK, items)
}

func (h *AdminHandler) ListAuditoria(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaAdmin {
		api.WriteError(w, r, http.StatusForbidden, "Apenas ADMIN pode acessar este recurso.")
		return
	}
	page := parseIntDefault(r.URL.Query().Get("page"), 0)
	size := parseIntDefault(r.URL.Query().Get("size"), 20)
	query := r.URL.Query().Get("q")

	resp, err := h.store.ListAuditoria(r.Context(), page, size, query)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao carregar auditoria.")
		return
	}
	api.WriteJSON(w, http.StatusOK, resp)
}

func (h *AdminHandler) CreateConta(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaAdmin {
		api.WriteError(w, r, http.StatusForbidden, "Apenas ADMIN pode acessar este recurso.")
		return
	}
	if !permissions.IsRootAdmin(conta) {
		api.WriteError(w, r, http.StatusForbidden, "Apenas o usuario admin pode criar contas.")
		return
	}

	var body store.CriarContaInput
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "JSON invalido.")
		return
	}
	created, err := h.store.CriarContaAdmin(r.Context(), body)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrUsuarioObrigatorio):
			api.WriteError(w, r, http.StatusBadRequest, "usuario obrigatorio.")
		case errors.Is(err, store.ErrNomeObrigatorio):
			api.WriteError(w, r, http.StatusBadRequest, "nome obrigatorio.")
		case errors.Is(err, store.ErrSenhaCurta):
			api.WriteError(w, r, http.StatusBadRequest, "senha deve ter no minimo 6 caracteres.")
		case errors.Is(err, store.ErrFiliaisObrigatorias):
			api.WriteError(w, r, http.StatusBadRequest, "Informe ao menos uma filial visivel.")
		case errors.Is(err, store.ErrUsuarioExistente):
			api.WriteError(w, r, http.StatusConflict, "Usuario ja existe.")
		default:
			api.WriteError(w, r, http.StatusInternalServerError, "Erro ao criar usuario.")
		}
		return
	}
	referenciaTipo := "USUARIO"
	referenciaID := created.Usuario
	_ = h.store.RegistrarAuditoria(r.Context(), store.AuditoriaInput{
		Usuario:        conta.Usuario,
		TipoConta:      string(conta.Tipo),
		Acao:           "USUARIO_CRIADO",
		ReferenciaTipo: &referenciaTipo,
		ReferenciaID:   &referenciaID,
		Detalhe:        "Usuario " + created.Usuario + " criado com visibilidade em " + strconv.Itoa(len(created.FiliaisVisiveis)) + " filial(is).",
	})
	api.WriteJSON(w, http.StatusCreated, created)
}

func (h *AdminHandler) AlterarSenha(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	if conta.Tipo != domain.TipoContaAdmin {
		api.WriteError(w, r, http.StatusForbidden, "Apenas ADMIN pode acessar este recurso.")
		return
	}
	target := strings.TrimSpace(chi.URLParam(r, "usuario"))
	if target == "" {
		api.WriteError(w, r, http.StatusBadRequest, "usuario obrigatorio.")
		return
	}

	var body store.AlterarSenhaInput
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "JSON invalido.")
		return
	}
	out, err := h.store.AlterarSenha(r.Context(), conta, target, body, permissions.IsRootAdmin(conta))
	if err != nil {
		switch {
		case errors.Is(err, store.ErrSenhaCurta):
			api.WriteError(w, r, http.StatusBadRequest, "novaSenha deve ter no minimo 6 caracteres.")
		case errors.Is(err, store.ErrUsuarioNaoEncontrado):
			api.WriteError(w, r, http.StatusNotFound, "Usuario nao encontrado.")
		case errors.Is(err, store.ErrSemPermissao):
			api.WriteError(w, r, http.StatusForbidden, "Sem permissao para alterar senha de outros usuarios.")
		case errors.Is(err, store.ErrSenhaAtualObrigatoria):
			api.WriteError(w, r, http.StatusBadRequest, "senhaAtual obrigatoria ao alterar a propria senha.")
		case errors.Is(err, store.ErrSenhaAtualInvalida):
			api.WriteError(w, r, http.StatusBadRequest, "senhaAtual invalida.")
		default:
			api.WriteError(w, r, http.StatusInternalServerError, "Erro ao alterar senha.")
		}
		return
	}
	referenciaTipo := "USUARIO"
	referenciaID := out.Usuario
	detalhe := "Senha do usuario " + out.Usuario + " alterada por " + conta.Usuario + "."
	if strings.EqualFold(out.Usuario, conta.Usuario) {
		detalhe = "Usuario " + out.Usuario + " alterou a propria senha."
	}
	_ = h.store.RegistrarAuditoria(r.Context(), store.AuditoriaInput{
		Usuario:        conta.Usuario,
		TipoConta:      string(conta.Tipo),
		Acao:           "SENHA_ALTERADA",
		ReferenciaTipo: &referenciaTipo,
		ReferenciaID:   &referenciaID,
		Detalhe:        detalhe,
	})
	api.WriteJSON(w, http.StatusOK, out)
}

func joinFiliais(values []string) string {
	if len(values) == 0 {
		return ""
	}
	out := values[0]
	for idx := 1; idx < len(values); idx++ {
		out += "," + values[idx]
	}
	return out
}
