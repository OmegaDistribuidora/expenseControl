package store

import (
	"context"
	"errors"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
	"github.com/jackc/pgx/v5"
)

func (s *PostgresStore) FindContaByUsuario(ctx context.Context, usuario string) (*domain.Conta, error) {
	const query = `
		SELECT
			id,
			nome,
			usuario,
			senha_hash,
			tipo,
			filial,
			filiais_visiveis,
			COALESCE(pode_aprovar_solicitacao, false) AS pode_aprovar_solicitacao,
			ativo
		FROM contas
		WHERE usuario = $1
		LIMIT 1
	`

	var conta domain.Conta
	var filial *string
	var filiaisVisiveis *string

	err := s.Pool.QueryRow(ctx, query, usuario).Scan(
		&conta.ID,
		&conta.Nome,
		&conta.Usuario,
		&conta.SenhaHash,
		&conta.Tipo,
		&filial,
		&filiaisVisiveis,
		&conta.PodeAprovarSolicitacao,
		&conta.Ativo,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if filial != nil {
		conta.Filial = *filial
	}
	if filiaisVisiveis != nil {
		conta.FiliaisVisiveis = *filiaisVisiveis
	}

	return &conta, nil
}
