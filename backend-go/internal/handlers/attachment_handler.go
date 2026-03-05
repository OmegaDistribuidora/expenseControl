package handlers

import (
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"unicode"

	api "github.com/OmegaDistribuidora/expenseControl/backend-go/internal/api"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/config"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/permissions"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/storage"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/store"
	"github.com/go-chi/chi/v5"
	"golang.org/x/text/unicode/norm"
)

type AttachmentHandler struct {
	store   *store.PostgresStore
	storage *storage.LocalAttachments
}

func NewAttachmentHandler(cfg config.Config, store *store.PostgresStore) *AttachmentHandler {
	return &AttachmentHandler{
		store:   store,
		storage: storage.NewLocalAttachments(cfg.AttachmentsLocalRoot),
	}
}

func (h *AttachmentHandler) ListBySolicitacao(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}

	solicitacaoID, err := strconv.ParseInt(chi.URLParam(r, "solicitacaoId"), 10, 64)
	if err != nil || solicitacaoID <= 0 {
		api.WriteError(w, r, http.StatusBadRequest, "Solicitacao invalida.")
		return
	}

	solicitacao, err := h.store.GetSolicitacaoByID(r.Context(), solicitacaoID)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao consultar solicitacao.")
		return
	}
	if solicitacao == nil {
		api.WriteError(w, r, http.StatusNotFound, "Solicitacao nao encontrada.")
		return
	}
	if !canViewSolicitacao(conta, solicitacao) {
		api.WriteError(w, r, http.StatusForbidden, "Sem permissao para visualizar anexos.")
		return
	}

	items, err := h.store.ListAttachmentsBySolicitacao(r.Context(), solicitacaoID)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao carregar anexos.")
		return
	}
	api.WriteJSON(w, http.StatusOK, items)
}

func (h *AttachmentHandler) Upload(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	solicitacaoID, err := strconv.ParseInt(chi.URLParam(r, "solicitacaoId"), 10, 64)
	if err != nil || solicitacaoID <= 0 {
		api.WriteError(w, r, http.StatusBadRequest, "Solicitacao invalida.")
		return
	}
	solicitacao, err := h.store.GetSolicitacaoByID(r.Context(), solicitacaoID)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao consultar solicitacao.")
		return
	}
	if solicitacao == nil {
		api.WriteError(w, r, http.StatusNotFound, "Solicitacao nao encontrada.")
		return
	}
	if !canViewSolicitacao(conta, solicitacao) {
		api.WriteError(w, r, http.StatusForbidden, "Sem permissao para anexos.")
		return
	}
	if !canChangeAttachments(conta, solicitacao) {
		api.WriteError(w, r, http.StatusForbidden, "Usuario sem permissao para alterar anexos.")
		return
	}
	if solicitacao.Status != domain.StatusPendente {
		api.WriteError(w, r, http.StatusConflict, "Solicitacao nao aceita anexos neste status.")
		return
	}

	if err := r.ParseMultipartForm(12 << 20); err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "Falha ao ler multipart.")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "Arquivo nao enviado.")
		return
	}
	defer file.Close()

	if header.Size > maxFileSize {
		api.WriteError(w, r, http.StatusBadRequest, "Arquivo excede 10MB.")
		return
	}
	contentType := strings.ToLower(strings.TrimSpace(header.Header.Get("Content-Type")))
	if contentType == "" {
		contentType = strings.ToLower(strings.TrimSpace(mime.TypeByExtension(strings.ToLower(filepath.Ext(header.Filename)))))
	}
	if _, ok := allowedTypes[contentType]; !ok {
		api.WriteError(w, r, http.StatusBadRequest, "Tipo de arquivo nao permitido.")
		return
	}
	total, err := h.store.CountAttachmentsBySolicitacao(r.Context(), solicitacaoID)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao consultar anexos.")
		return
	}
	if total >= maxAttachments {
		api.WriteError(w, r, http.StatusBadRequest, "Limite de anexos atingido.")
		return
	}

	originalName := sanitizeOriginalName(header.Filename)
	storedName := buildStoredName(solicitacao, originalName, total+1)
	folderID, err := h.storage.EnsureFolder(solicitacaoID)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Falha ao criar pasta de anexos.")
		return
	}
	fileID, err := h.storage.UploadFile(folderID, storedName, file)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Falha ao salvar arquivo localmente.")
		return
	}

	attachment, err := h.store.CreateAttachment(r.Context(), domain.Attachment{
		SolicitacaoID: solicitacaoID,
		DriveFileID:   fileID,
		DriveFolderID: &folderID,
		OriginalName:  originalName,
		StoredName:    storedName,
		ContentType:   contentType,
		Size:          header.Size,
		UploadedBy:    conta.Usuario,
	})
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao registrar anexo.")
		return
	}
	referenciaTipo := "SOLICITACAO"
	referenciaID := strconv.FormatInt(solicitacaoID, 10)
	_ = h.store.RegistrarAuditoria(r.Context(), store.AuditoriaInput{
		Usuario:        conta.Usuario,
		TipoConta:      string(conta.Tipo),
		Acao:           "ANEXO_ENVIADO",
		ReferenciaTipo: &referenciaTipo,
		ReferenciaID:   &referenciaID,
		Detalhe:        "Anexo \"" + attachment.OriginalName + "\" enviado para solicitacao #" + strconv.FormatInt(solicitacaoID, 10) + ".",
	})
	api.WriteJSON(w, http.StatusCreated, attachment)
}

func (h *AttachmentHandler) Download(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	attachmentID, err := strconv.ParseInt(chi.URLParam(r, "attachmentId"), 10, 64)
	if err != nil || attachmentID <= 0 {
		api.WriteError(w, r, http.StatusBadRequest, "Anexo invalido.")
		return
	}
	attachment, err := h.store.FindAttachmentByID(r.Context(), attachmentID)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao consultar anexo.")
		return
	}
	if attachment == nil {
		api.WriteError(w, r, http.StatusNotFound, "Anexo nao encontrado.")
		return
	}
	solicitacao, err := h.store.GetSolicitacaoByID(r.Context(), attachment.SolicitacaoID)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao consultar solicitacao.")
		return
	}
	if solicitacao == nil || !canViewSolicitacao(conta, solicitacao) {
		api.WriteError(w, r, http.StatusForbidden, "Sem permissao para baixar anexo.")
		return
	}

	f, err := h.storage.OpenFile(attachment.DriveFileID)
	if err != nil {
		api.WriteError(w, r, http.StatusNotFound, "Arquivo fisico do anexo nao encontrado.")
		return
	}
	defer f.Close()

	contentType := attachment.ContentType
	if strings.TrimSpace(contentType) == "" {
		contentType = "application/octet-stream"
	}
	disposition := resolveDisposition(r.URL.Query().Get("disposition"), contentType)
	filename := strings.ReplaceAll(strings.TrimSpace(attachment.OriginalName), "\"", "'")
	if filename == "" {
		filename = "arquivo"
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", disposition+`; filename="`+filename+`"`)
	w.Header().Set("Content-Length", strconv.FormatInt(attachment.Size, 10))
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, f)
}

func (h *AttachmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}
	attachmentID, err := strconv.ParseInt(chi.URLParam(r, "attachmentId"), 10, 64)
	if err != nil || attachmentID <= 0 {
		api.WriteError(w, r, http.StatusBadRequest, "Anexo invalido.")
		return
	}
	attachment, err := h.store.FindAttachmentByID(r.Context(), attachmentID)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao consultar anexo.")
		return
	}
	if attachment == nil {
		api.WriteError(w, r, http.StatusNotFound, "Anexo nao encontrado.")
		return
	}
	solicitacao, err := h.store.GetSolicitacaoByID(r.Context(), attachment.SolicitacaoID)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao consultar solicitacao.")
		return
	}
	if solicitacao == nil || !canViewSolicitacao(conta, solicitacao) {
		api.WriteError(w, r, http.StatusForbidden, "Sem permissao para excluir anexo.")
		return
	}
	if !canChangeAttachments(conta, solicitacao) {
		api.WriteError(w, r, http.StatusForbidden, "Usuario sem permissao para alterar anexos.")
		return
	}
	if solicitacao.Status != domain.StatusPendente {
		api.WriteError(w, r, http.StatusConflict, "Solicitacao nao aceita anexos neste status.")
		return
	}

	_ = h.storage.DeleteFile(attachment.DriveFileID)
	if err := h.store.DeleteAttachmentByID(r.Context(), attachmentID); err != nil {
		if err == store.ErrAnexoNaoEncontrado {
			api.WriteError(w, r, http.StatusNotFound, "Anexo nao encontrado.")
			return
		}
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao excluir anexo.")
		return
	}
	referenciaTipo := "SOLICITACAO"
	referenciaID := strconv.FormatInt(attachment.SolicitacaoID, 10)
	_ = h.store.RegistrarAuditoria(r.Context(), store.AuditoriaInput{
		Usuario:        conta.Usuario,
		TipoConta:      string(conta.Tipo),
		Acao:           "ANEXO_EXCLUIDO",
		ReferenciaTipo: &referenciaTipo,
		ReferenciaID:   &referenciaID,
		Detalhe:        "Anexo \"" + attachment.OriginalName + "\" removido da solicitacao #" + strconv.FormatInt(attachment.SolicitacaoID, 10) + ".",
	})
	w.WriteHeader(http.StatusNoContent)
}

func canViewSolicitacao(conta *domain.Conta, solicitacao *domain.Solicitacao) bool {
	if conta == nil || solicitacao == nil {
		return false
	}
	switch conta.Tipo {
	case domain.TipoContaFilial:
		return strings.EqualFold(strings.TrimSpace(conta.Filial), strings.TrimSpace(solicitacao.Filial))
	case domain.TipoContaAdmin:
		return permissions.CanViewFilial(conta, solicitacao.Filial)
	default:
		return false
	}
}

func canChangeAttachments(conta *domain.Conta, solicitacao *domain.Solicitacao) bool {
	if conta == nil || solicitacao == nil {
		return false
	}
	if conta.Tipo == domain.TipoContaFilial {
		return strings.EqualFold(strings.TrimSpace(conta.Filial), strings.TrimSpace(solicitacao.Filial))
	}
	if conta.Tipo == domain.TipoContaAdmin {
		return permissions.CanApproveSolicitacao(conta) && permissions.CanViewFilial(conta, solicitacao.Filial)
	}
	return false
}

func resolveDisposition(requested, contentType string) string {
	value := strings.ToLower(strings.TrimSpace(requested))
	ct := strings.ToLower(strings.TrimSpace(contentType))
	if value == "inline" && (strings.HasPrefix(ct, "image/") || ct == "application/pdf") {
		return "inline"
	}
	return "attachment"
}

func sanitizeOriginalName(original string) string {
	name := strings.ReplaceAll(original, "\\", "/")
	idx := strings.LastIndex(name, "/")
	if idx >= 0 {
		name = name[idx+1:]
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return "arquivo"
	}
	return name
}

func buildStoredName(solicitacao *domain.Solicitacao, original string, sequence int64) string {
	ext := strings.ToLower(filepath.Ext(original))
	titleSlug := slugify(solicitacao.Titulo)
	base := "solicitacao-" + strconv.FormatInt(solicitacao.ID, 10) + "-" + titleSlug + "-" + leftPad(sequence, 3)
	if ext == "" {
		return base
	}
	return base + ext
}

func leftPad(value int64, width int) string {
	raw := strconv.FormatInt(value, 10)
	for len(raw) < width {
		raw = "0" + raw
	}
	return raw
}

func slugify(value string) string {
	if strings.TrimSpace(value) == "" {
		return "sem-titulo"
	}
	normalized := norm.NFD.String(strings.ToLower(strings.TrimSpace(value)))
	var out strings.Builder
	lastDash := false
	for _, r := range normalized {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			out.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			out.WriteRune('-')
			lastDash = true
		}
	}
	result := strings.Trim(out.String(), "-")
	if result == "" {
		return "sem-titulo"
	}
	return result
}

const (
	maxFileSize    = 10 * 1024 * 1024
	maxAttachments = 5
)

var allowedTypes = map[string]struct{}{
	"application/pdf": {},
	"image/jpeg":      {},
	"image/png":       {},
	"image/jpg":       {},
}
