package store

import (
	"context"
	"errors"
	"strings"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
	"github.com/jackc/pgx/v5"
)

func (s *PostgresStore) CreateCategoria(ctx context.Context, nome string, descricao *string) (*domain.Categoria, error) {
	nome = strings.TrimSpace(nome)
	if nome == "" {
		return nil, ErrCategoriaNomeObrigatorio
	}
	var exists bool
	if err := s.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM categorias WHERE lower(nome)=lower($1))`, nome).Scan(&exists); err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrCategoriaJaExiste
	}
	var categoria domain.Categoria
	err := s.Pool.QueryRow(ctx, `
		INSERT INTO categorias (nome, descricao, ativa)
		VALUES ($1,$2,true)
		RETURNING id, nome, descricao, ativa
	`, nome, domain.NormalizeOptionalString(descricao)).Scan(
		&categoria.ID, &categoria.Nome, &categoria.Descricao, &categoria.Ativa,
	)
	if err != nil {
		return nil, err
	}
	return &categoria, nil
}

func (s *PostgresStore) InativarCategoria(ctx context.Context, id int64) (*domain.Categoria, error) {
	var categoria domain.Categoria
	err := s.Pool.QueryRow(ctx, `
		SELECT id, nome, descricao, ativa
		FROM categorias
		WHERE id = $1
		LIMIT 1
	`, id).Scan(&categoria.ID, &categoria.Nome, &categoria.Descricao, &categoria.Ativa)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCategoriaNaoEncontrada
		}
		return nil, err
	}
	if categoria.Ativa {
		if _, err := s.Pool.Exec(ctx, `UPDATE categorias SET ativa = false WHERE id = $1`, id); err != nil {
			return nil, err
		}
		categoria.Ativa = false
	}
	return &categoria, nil
}

var (
	ErrCategoriaNomeObrigatorio = errors.New("categoria_nome_obrigatorio")
	ErrCategoriaJaExiste        = errors.New("categoria_ja_existe")
	ErrCategoriaNaoEncontrada   = errors.New("categoria_nao_encontrada")
)
