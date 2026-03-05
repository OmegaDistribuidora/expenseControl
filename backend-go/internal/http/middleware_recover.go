package httpx

import (
	"log"
	"net/http"

	api "github.com/OmegaDistribuidora/expenseControl/backend-go/internal/api"
)

func Recoverer() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					log.Printf("panic em %s %s: %v", r.Method, r.URL.Path, rec)
					api.WriteError(w, r, http.StatusInternalServerError, "Erro interno.")
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
