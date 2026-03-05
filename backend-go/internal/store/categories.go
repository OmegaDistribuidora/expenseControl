package store

import (
	"context"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
)

func (s *PostgresStore) ListCategoriasAtivas(ctx context.Context) ([]domain.Categoria, error) {
	const query = `
		SELECT id, nome, descricao, ativa
		FROM categorias
		WHERE ativa = true
		ORDER BY nome ASC
	`
	return s.listCategorias(ctx, query)
}

func (s *PostgresStore) ListCategorias(ctx context.Context) ([]domain.Categoria, error) {
	const query = `
		SELECT id, nome, descricao, ativa
		FROM categorias
		ORDER BY nome ASC
	`
	return s.listCategorias(ctx, query)
}

func (s *PostgresStore) listCategorias(ctx context.Context, query string) ([]domain.Categoria, error) {
	rows, err := s.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.Categoria, 0)
	for rows.Next() {
		var item domain.Categoria
		if err := rows.Scan(&item.ID, &item.Nome, &item.Descricao, &item.Ativa); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}
