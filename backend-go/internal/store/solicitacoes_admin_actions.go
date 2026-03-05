package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/permissions"
	"github.com/jackc/pgx/v5"
)

type PedidoInfoInput struct {
	Comentario string
}

type DecisaoInput struct {
	Decisao       string
	ValorAprovado *float64
	Comentario    *string
}

func (s *PostgresStore) PedirInfoSolicitacao(ctx context.Context, admin *domain.Conta, id int64, input PedidoInfoInput) (*domain.Solicitacao, error) {
	tx, err := s.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer rollbackQuietly(ctx, tx)

	solicitacao, err := getSolicitacaoOwnerAndStatus(ctx, tx, id)
	if err != nil {
		return nil, err
	}
	if solicitacao == nil {
		return nil, ErrSolicitacaoNaoEncontrada
	}
	if !permissions.CanViewFilial(admin, solicitacao.Filial) {
		return nil, ErrSolicitacaoSemPermissao
	}
	if solicitacao.Status != domain.StatusPendente {
		return nil, ErrSolicitacaoStatusInvalido
	}

	normalizedComment := strings.TrimSpace(input.Comentario)
	now := time.Now().UTC()
	_, err = tx.Exec(ctx, `
		UPDATE solicitacoes
		SET status = $2,
		    comentario_decisao = $3,
		    decidido_em = NULL,
		    valor_aprovado = NULL
		WHERE id = $1
	`, id, domain.StatusPendenteInfo, normalizedComment, now)
	if err != nil {
		return nil, err
	}

	commentPtr := &normalizedComment
	if normalizedComment == "" {
		commentPtr = nil
	}
	if err := insertHistorico(ctx, tx, id, string(admin.Tipo), "PEDIDO_INFO", commentPtr); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.GetSolicitacaoByID(ctx, id)
}

func (s *PostgresStore) DecidirSolicitacao(ctx context.Context, admin *domain.Conta, id int64, input DecisaoInput) (*domain.Solicitacao, error) {
	tx, err := s.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer rollbackQuietly(ctx, tx)

	current, err := s.loadSolicitacaoForDecisao(ctx, tx, id)
	if err != nil {
		return nil, err
	}
	if current == nil {
		return nil, ErrSolicitacaoNaoEncontrada
	}
	if !permissions.CanViewFilial(admin, current.Filial) {
		return nil, ErrSolicitacaoSemPermissao
	}
	if current.Status != domain.StatusPendente {
		return nil, ErrSolicitacaoStatusInvalido
	}

	decisao := strings.ToUpper(strings.TrimSpace(input.Decisao))
	if decisao != "APROVADO" && decisao != "REPROVADO" {
		return nil, ErrDecisaoInvalida
	}
	now := time.Now().UTC()
	status := domain.StatusAprovado
	acao := "APROVADA"
	valorAprovado := input.ValorAprovado
	if decisao == "REPROVADO" {
		status = domain.StatusReprovado
		acao = "REPROVADA"
		valorAprovado = nil
	} else if valorAprovado == nil {
		value := current.ValorEstimado
		valorAprovado = &value
	}

	_, err = tx.Exec(ctx, `
		UPDATE solicitacoes
		SET status = $2,
		    valor_aprovado = $3,
		    comentario_decisao = $4,
		    decidido_em = $5
		WHERE id = $1
	`, id, status, valorAprovado, domain.NormalizeOptionalString(input.Comentario), now)
	if err != nil {
		return nil, err
	}

	if err := insertHistorico(ctx, tx, id, string(admin.Tipo), acao, domain.NormalizeOptionalString(input.Comentario)); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.GetSolicitacaoByID(ctx, id)
}

func (s *PostgresStore) ExcluirSolicitacao(ctx context.Context, admin *domain.Conta, id int64) error {
	tx, err := s.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer rollbackQuietly(ctx, tx)

	current, err := getSolicitacaoOwnerAndStatus(ctx, tx, id)
	if err != nil {
		return err
	}
	if current == nil {
		return ErrSolicitacaoNaoEncontrada
	}
	if !permissions.CanViewFilial(admin, current.Filial) {
		return ErrSolicitacaoSemPermissao
	}

	// Remove apenas dados de banco. Mesmo se o arquivo fisico nao existir, nao bloqueia exclusao.
	if _, err := tx.Exec(ctx, "DELETE FROM anexos WHERE solicitacao_id = $1", id); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, "DELETE FROM solicitacao_historico WHERE solicitacao_id = $1", id); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, "DELETE FROM solicitacao_linhas WHERE solicitacao_id = $1", id); err != nil {
		return err
	}
	cmd, err := tx.Exec(ctx, "DELETE FROM solicitacoes WHERE id = $1", id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrSolicitacaoNaoEncontrada
	}
	return tx.Commit(ctx)
}

func (s *PostgresStore) loadSolicitacaoForDecisao(ctx context.Context, q queryable, id int64) (*struct {
	Filial        string
	Status        domain.StatusSolicitacao
	ValorEstimado float64
}, error) {
	const query = `SELECT filial, status, valor_estimado::float8 FROM solicitacoes WHERE id = $1 LIMIT 1`
	var out struct {
		Filial        string
		Status        domain.StatusSolicitacao
		ValorEstimado float64
	}
	err := q.QueryRow(ctx, query, id).Scan(&out.Filial, &out.Status, &out.ValorEstimado)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &out, nil
}

var ErrDecisaoInvalida = errors.New("decisao_invalida")
