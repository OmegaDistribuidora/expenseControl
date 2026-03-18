package httpx

import (
	"net/http"
	"strings"

	api "github.com/OmegaDistribuidora/expenseControl/backend-go/internal/api"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/config"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/security"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/store"
	"golang.org/x/crypto/bcrypt"
)

func AuthMiddleware(cfg config.Config, store *store.PostgresStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var conta *domain.Conta
			var err error

			authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
			switch {
			case strings.HasPrefix(strings.ToLower(authHeader), "bearer "):
				token := strings.TrimSpace(authHeader[len("Bearer "):])
				claims, tokenErr := security.ParseLocalToken(cfg.AuthTokenSecret, token)
				if tokenErr != nil || strings.TrimSpace(claims.Usuario) == "" {
					unauthorized(w, r, "Token invalido.")
					return
				}

				conta, err = store.FindContaByUsuario(r.Context(), claims.Usuario)
				if err != nil {
					api.WriteError(w, r, http.StatusInternalServerError, "Erro interno.")
					return
				}
				if conta == nil || !conta.Ativo {
					unauthorized(w, r, "Usuario nao encontrado ou inativo.")
					return
				}
			default:
				username, password, ok := r.BasicAuth()
				if !ok || username == "" || password == "" {
					unauthorized(w, r, "Usuario nao autenticado.")
					return
				}

				conta, err = store.FindContaByUsuario(r.Context(), username)
				if err != nil {
					api.WriteError(w, r, http.StatusInternalServerError, "Erro interno.")
					return
				}
				if conta == nil || !conta.Ativo {
					unauthorized(w, r, "Credenciais invalidas.")
					return
				}

				if err := bcrypt.CompareHashAndPassword([]byte(conta.SenhaHash), []byte(password)); err != nil {
					unauthorized(w, r, "Credenciais invalidas.")
					return
				}
			}

			next.ServeHTTP(w, r.WithContext(api.WithConta(r.Context(), conta)))
		})
	}
}

func RequireRole(role domain.TipoConta) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			conta, ok := api.ContaFromContext(r.Context())
			if !ok {
				unauthorized(w, r, "Usuario nao autenticado.")
				return
			}
			if conta.Tipo != role {
				api.WriteError(w, r, http.StatusForbidden, "Acesso negado.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func unauthorized(w http.ResponseWriter, r *http.Request, message string) {
	w.Header().Set("WWW-Authenticate", `Basic realm="expense-control", Bearer`)
	api.WriteError(w, r, http.StatusUnauthorized, message)
}
