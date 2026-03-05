package store

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresStore struct {
	Pool *pgxpool.Pool
}

func NewPostgresStore(ctx context.Context, connString string) (*PostgresStore, error) {
	pool, err := pgxpool.New(ctx, connString)
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
