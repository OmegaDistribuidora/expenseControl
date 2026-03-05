package handlers

import (
	"net/http"

	api "github.com/OmegaDistribuidora/expenseControl/backend-go/internal/api"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/permissions"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

type authMeResponse struct {
	Usuario                string   `json:"usuario"`
	Nome                   string   `json:"nome"`
	Tipo                   string   `json:"tipo"`
	Filial                 string   `json:"filial"`
	PodeAprovarSolicitacao bool     `json:"podeAprovarSolicitacao"`
	SuperAdmin             bool     `json:"superAdmin"`
	FiliaisVisiveis        []string `json:"filiaisVisiveis"`
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}

	resp := authMeResponse{
		Usuario:                conta.Usuario,
		Nome:                   conta.Nome,
		Tipo:                   string(conta.Tipo),
		Filial:                 conta.Filial,
		PodeAprovarSolicitacao: permissions.CanApproveSolicitacao(conta),
		SuperAdmin:             permissions.IsRootAdmin(conta),
		FiliaisVisiveis:        permissions.VisibleFiliaisList(conta),
	}
	api.WriteJSON(w, http.StatusOK, resp)
}
