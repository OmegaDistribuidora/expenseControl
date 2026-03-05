package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	api "github.com/OmegaDistribuidora/expenseControl/backend-go/internal/api"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/store"
	"github.com/go-chi/chi/v5"
)

type CategoryHandler struct {
	store *store.PostgresStore
}

func NewCategoryHandler(store *store.PostgresStore) *CategoryHandler {
	return &CategoryHandler{store: store}
}

func (h *CategoryHandler) ListActive(w http.ResponseWriter, r *http.Request) {
	categorias, err := h.store.ListCategoriasAtivas(r.Context())
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao carregar categorias.")
		return
	}
	api.WriteJSON(w, http.StatusOK, categorias)
}

func (h *CategoryHandler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	categorias, err := h.store.ListCategorias(r.Context())
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro ao carregar categorias.")
		return
	}
	api.WriteJSON(w, http.StatusOK, categorias)
}

type categoriaCreateRequest struct {
	Nome      string  `json:"nome"`
	Descricao *string `json:"descricao"`
}

func (h *CategoryHandler) CreateAdmin(w http.ResponseWriter, r *http.Request) {
	var body categoriaCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "JSON invalido.")
		return
	}
	if strings.TrimSpace(body.Nome) == "" {
		api.WriteError(w, r, http.StatusBadRequest, "nome obrigatorio.")
		return
	}
	if len(strings.TrimSpace(body.Nome)) > 120 {
		api.WriteError(w, r, http.StatusBadRequest, "nome deve ter no maximo 120 caracteres.")
		return
	}
	if body.Descricao != nil && len(strings.TrimSpace(*body.Descricao)) > 255 {
		api.WriteError(w, r, http.StatusBadRequest, "descricao deve ter no maximo 255 caracteres.")
		return
	}
	item, err := h.store.CreateCategoria(r.Context(), body.Nome, body.Descricao)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrCategoriaNomeObrigatorio):
			api.WriteError(w, r, http.StatusBadRequest, "nome obrigatorio.")
		case errors.Is(err, store.ErrCategoriaJaExiste):
			api.WriteError(w, r, http.StatusConflict, "Ja existe uma categoria com esse nome.")
		default:
			api.WriteError(w, r, http.StatusInternalServerError, "Erro ao criar categoria.")
		}
		return
	}
	conta, _ := api.ContaFromContext(r.Context())
	if conta != nil {
		referenciaTipo := "CATEGORIA"
		_ = h.store.RegistrarAuditoria(r.Context(), store.AuditoriaInput{
			Usuario:        conta.Usuario,
			TipoConta:      string(conta.Tipo),
			Acao:           "CATEGORIA_CRIADA",
			ReferenciaTipo: &referenciaTipo,
			ReferenciaID:   strPtrInt64(item.ID),
			Detalhe:        "Categoria \"" + item.Nome + "\" criada.",
		})
	}
	api.WriteJSON(w, http.StatusCreated, item)
}

func (h *CategoryHandler) InativarAdmin(w http.ResponseWriter, r *http.Request) {
	idRaw := chi.URLParam(r, "id")
	id, err := parseInt64(idRaw)
	if err != nil || id <= 0 {
		api.WriteError(w, r, http.StatusBadRequest, "Categoria invalida.")
		return
	}
	item, err := h.store.InativarCategoria(r.Context(), id)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrCategoriaNaoEncontrada):
			api.WriteError(w, r, http.StatusNotFound, "Categoria nao encontrada.")
		default:
			api.WriteError(w, r, http.StatusInternalServerError, "Erro ao inativar categoria.")
		}
		return
	}
	conta, _ := api.ContaFromContext(r.Context())
	if conta != nil {
		referenciaTipo := "CATEGORIA"
		_ = h.store.RegistrarAuditoria(r.Context(), store.AuditoriaInput{
			Usuario:        conta.Usuario,
			TipoConta:      string(conta.Tipo),
			Acao:           "CATEGORIA_INATIVADA",
			ReferenciaTipo: &referenciaTipo,
			ReferenciaID:   strPtrInt64(item.ID),
			Detalhe:        "Categoria \"" + item.Nome + "\" inativada.",
		})
	}
	api.WriteJSON(w, http.StatusOK, item)
}

func parseInt64(value string) (int64, error) {
	return strconv.ParseInt(strings.TrimSpace(value), 10, 64)
}

func strPtrInt64(value int64) *string {
	text := strconv.FormatInt(value, 10)
	return &text
}
