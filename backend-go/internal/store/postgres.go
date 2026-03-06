package store

import (
	"context"
	"fmt"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresStore struct {
	Pool *pgxpool.Pool
}

func NewPostgresStore(ctx context.Context, connString string, cfg config.Config) (*PostgresStore, error) {
	poolCfg, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("erro ao parsear configuracao postgres: %w", err)
	}

	if cfg.DBMaxConns > 0 {
		poolCfg.MaxConns = cfg.DBMaxConns
	}
	if cfg.DBMinConns >= 0 {
		poolCfg.MinConns = cfg.DBMinConns
	}
	if cfg.DBMaxConnLifetime > 0 {
		poolCfg.MaxConnLifetime = cfg.DBMaxConnLifetime
	}
	if cfg.DBMaxConnIdleTime > 0 {
		poolCfg.MaxConnIdleTime = cfg.DBMaxConnIdleTime
	}
	if cfg.DBHealthCheckPeriod > 0 {
		poolCfg.HealthCheckPeriod = cfg.DBHealthCheckPeriod
	}

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar pool postgres: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("erro ao conectar no postgres: %w", err)
	}

	return &PostgresStore{Pool: pool}, nil
}

func (s *PostgresStore) Close() {
	if s == nil || s.Pool == nil {
		return
	}
	s.Pool.Close()
}
