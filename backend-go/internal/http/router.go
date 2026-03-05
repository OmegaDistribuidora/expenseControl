package httpx

import (
	"net/http"

	api "github.com/OmegaDistribuidora/expenseControl/backend-go/internal/api"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/config"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/handlers"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func NewRouter(cfg config.Config, db *store.PostgresStore) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(Recoverer())
	r.Use(CORS(cfg.CORSAllowedOrigins))

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	authHandler := handlers.NewAuthHandler()
	categoryHandler := handlers.NewCategoryHandler(db)
	solicitacaoHandler := handlers.NewSolicitacaoHandler(cfg, db)
	adminHandler := handlers.NewAdminHandler(db)
	attachmentHandler := handlers.NewAttachmentHandler(cfg, db)

	r.Group(func(protected chi.Router) {
		protected.Use(BasicAuth(db))
		protected.Get("/auth/me", authHandler.Me)

		protected.Group(func(filial chi.Router) {
			filial.Use(RequireRole(domain.TipoContaFilial))
			filial.Get("/solicitacoes", solicitacaoHandler.ListFilial)
			filial.Get("/solicitacoes/{id}", solicitacaoHandler.GetFilial)
			filial.Post("/solicitacoes", solicitacaoHandler.CreateFilial)
			filial.Put("/solicitacoes/{id}/reenvio", solicitacaoHandler.ReenvioFilial)
			filial.Get("/categorias", categoryHandler.ListActive)
		})

		protected.Get("/solicitacoes/{solicitacaoId}/anexos", attachmentHandler.ListBySolicitacao)
		protected.Post("/solicitacoes/{solicitacaoId}/anexos", attachmentHandler.Upload)
		protected.Get("/requests/{solicitacaoId}/attachments", attachmentHandler.ListBySolicitacao)
		protected.Post("/requests/{solicitacaoId}/attachments", attachmentHandler.Upload)
		protected.Get("/anexos/{attachmentId}/download", attachmentHandler.Download)
		protected.Get("/attachments/{attachmentId}/download", attachmentHandler.Download)
		protected.Delete("/anexos/{attachmentId}", attachmentHandler.Delete)
		protected.Delete("/attachments/{attachmentId}", attachmentHandler.Delete)

		protected.Route("/admin", func(admin chi.Router) {
			admin.Use(RequireRole(domain.TipoContaAdmin))
			admin.Get("/categorias", categoryHandler.ListAdmin)
			admin.Post("/categorias", categoryHandler.CreateAdmin)
			admin.Patch("/categorias/{id}/inativar", categoryHandler.InativarAdmin)
			admin.Get("/solicitacoes", solicitacaoHandler.ListAdmin)
			admin.Get("/solicitacoes/estatisticas", solicitacaoHandler.StatsAdmin)
			admin.Patch("/solicitacoes/{id}/pedido-info", solicitacaoHandler.PedidoInfoAdmin)
			admin.Patch("/solicitacoes/{id}/decisao", solicitacaoHandler.DecisaoAdmin)
			admin.Delete("/solicitacoes/{id}", solicitacaoHandler.ExcluirAdmin)
			admin.Get("/contas", adminHandler.ListContas)
			admin.Get("/contas/filiais", adminHandler.ListFiliais)
			admin.Post("/contas", adminHandler.CreateConta)
			admin.Put("/contas/{usuario}/senha", adminHandler.AlterarSenha)
			admin.Get("/auditoria", adminHandler.ListAuditoria)
		})
	})

	r.NotFound(func(w http.ResponseWriter, req *http.Request) {
		api.WriteError(w, req, http.StatusNotFound, "Recurso nao encontrado.")
	})

	return r
}
