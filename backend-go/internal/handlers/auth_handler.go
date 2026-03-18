package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	api "github.com/OmegaDistribuidora/expenseControl/backend-go/internal/api"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/config"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/permissions"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/security"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/store"
	"github.com/golang-jwt/jwt/v5"
)

type AuthHandler struct {
	cfg               config.Config
	store             *store.PostgresStore
	mu                sync.Mutex
	consumedSsoTokens map[string]time.Time
}

func NewAuthHandler(cfg config.Config, store *store.PostgresStore) *AuthHandler {
	return &AuthHandler{
		cfg:               cfg,
		store:             store,
		consumedSsoTokens: make(map[string]time.Time),
	}
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

type ssoExchangeRequest struct {
	Token string `json:"token"`
}

type ssoExchangeResponse struct {
	Token    string         `json:"token"`
	AuthType string         `json:"authType"`
	Profile  authMeResponse `json:"profile"`
}

func buildAuthMeResponse(conta *domain.Conta) authMeResponse {
	return authMeResponse{
		Usuario:                conta.Usuario,
		Nome:                   conta.Nome,
		Tipo:                   string(conta.Tipo),
		Filial:                 conta.Filial,
		PodeAprovarSolicitacao: permissions.CanApproveSolicitacao(conta),
		SuperAdmin:             permissions.IsRootAdmin(conta),
		FiliaisVisiveis:        permissions.VisibleFiliaisList(conta),
	}
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	conta, ok := api.ContaFromContext(r.Context())
	if !ok {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario nao autenticado.")
		return
	}

	api.WriteJSON(w, http.StatusOK, buildAuthMeResponse(conta))
}

func (h *AuthHandler) SsoExchange(w http.ResponseWriter, r *http.Request) {
	if strings.TrimSpace(h.cfg.EcosystemSsoSecret) == "" {
		api.WriteError(w, r, http.StatusNotFound, "Login delegado indisponivel.")
		return
	}

	var body ssoExchangeRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "JSON invalido.")
		return
	}
	if strings.TrimSpace(body.Token) == "" {
		api.WriteError(w, r, http.StatusBadRequest, "Token SSO obrigatorio.")
		return
	}

	claims, err := security.ParseEcosystemSsoToken(
		h.cfg.EcosystemSsoSecret,
		h.cfg.EcosystemSsoIssuer,
		h.cfg.EcosystemSsoAudience,
		body.Token,
	)
	if err != nil {
		api.WriteError(w, r, http.StatusUnauthorized, "Token SSO invalido ou expirado.")
		return
	}
	if h.isConsumed(claims.ID) {
		api.WriteError(w, r, http.StatusUnauthorized, "Token SSO ja utilizado.")
		return
	}

	targetLogin := strings.ToLower(strings.TrimSpace(claims.TargetLogin))
	if targetLogin == "" {
		api.WriteError(w, r, http.StatusBadRequest, "Token SSO sem login de destino.")
		return
	}

	conta, err := h.store.FindContaByUsuario(r.Context(), targetLogin)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Erro interno.")
		return
	}
	if conta == nil || !conta.Ativo {
		api.WriteError(w, r, http.StatusUnauthorized, "Usuario alvo nao encontrado ou inativo.")
		return
	}

	h.markConsumed(claims.ID, claims.ExpiresAt)

	localToken, err := security.IssueLocalToken(h.cfg.AuthTokenSecret, conta)
	if err != nil {
		api.WriteError(w, r, http.StatusInternalServerError, "Falha ao gerar sessao delegada.")
		return
	}

	api.WriteJSON(w, http.StatusOK, ssoExchangeResponse{
		Token:    localToken,
		AuthType: "bearer",
		Profile:  buildAuthMeResponse(conta),
	})
}

func (h *AuthHandler) isConsumed(jti string) bool {
	if strings.TrimSpace(jti) == "" {
		return false
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	now := time.Now()
	for key, expiresAt := range h.consumedSsoTokens {
		if !expiresAt.After(now) {
			delete(h.consumedSsoTokens, key)
		}
	}

	expiresAt, ok := h.consumedSsoTokens[jti]
	return ok && expiresAt.After(now)
}

func (h *AuthHandler) markConsumed(jti string, expiresAt *jwt.NumericDate) {
	if strings.TrimSpace(jti) == "" || expiresAt == nil {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	h.consumedSsoTokens[jti] = expiresAt.Time
}
