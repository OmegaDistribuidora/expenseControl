package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/config"
	httpx "github.com/OmegaDistribuidora/expenseControl/backend-go/internal/http"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/store"
)

func main() {
	cfg := config.Load()
	connString, err := cfg.DatabaseConnString()
	if err != nil {
		log.Fatalf("erro de configuracao do banco: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()

	db, err := store.NewPostgresStore(ctx, connString)
	if err != nil {
		log.Fatalf("erro ao iniciar banco: %v", err)
	}
	defer db.Close()
	if cfg.SeedDefaultUsers {
		if err := db.SeedDefaultUsers(ctx); err != nil {
			log.Fatalf("erro ao fazer seed de usuarios padrao: %v", err)
		}
	}

	server := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           httpx.NewRouter(cfg, db),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("erro no shutdown: %v", err)
		}
	}()

	log.Printf("backend-go ouvindo em %s", cfg.Addr())
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("erro no servidor: %v", err)
	}
}
