package store

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
	"github.com/jackc/pgx/v5"
)

const (
	defaultPageSize = 20
	maxPageSize     = 50
)

type listFilters struct {
	Status         *domain.StatusSolicitacao
	Term           string
	SearchID       *int64
	SearchStatus   *domain.StatusSolicitacao
	Filial         *string
	VisibleFiliais []string
	SortKey        string
	Page           int
	Size           int
}

func (s *PostgresStore) ListSolicitacoesFilial(ctx context.Context, filial string, page, size int, sortKey, query string) (domain.PageResponse[domain.Solicitacao], error) {
	filters := listFilters{
		Filial:  &filial,
		SortKey: sortKey,
		Page:    page,
		Size:    size,
	}
	applySearchQuery(&filters, query)
	return s.listSolicitacoes(ctx, filters)
}

func (s *PostgresStore) ListSolicitacoesAdmin(ctx context.Context, status *domain.StatusSolicitacao, visibleFiliais []string, isRoot bool, page, size int, sortKey, query string) (domain.PageResponse[domain.Solicitacao], error) {
	filters := listFilters{
		Status:  status,
		SortKey: sortKey,
		Page:    page,
		Size:    size,
	}
	if !isRoot {
		filters.VisibleFiliais = normalizeFiliais(visibleFiliais)
		if len(filters.VisibleFiliais) == 0 {
			return domain.PageResponse[domain.Solicitacao]{
				Items:         []domain.Solicitacao{},
				Page:          max(0, page),
				Size:          sanitizeSize(size),
				TotalElements: 0,
				TotalPages:    0,
			}, nil
		}
	}
	applySearchQuery(&filters, query)
	return s.listSolicitacoes(ctx, filters)
}

func (s *PostgresStore) GetSolicitacaoByID(ctx context.Context, id int64) (*domain.Solicitacao, error) {
	query := baseSolicitacaoSelect() + " WHERE s.id = $1"
	row, err := s.scanSolicitacoes(ctx, query, []any{id})
	if err != nil {
		return nil, err
	}
	if len(row) == 0 {
		return nil, nil
	}
	return &row[0], nil
}

func (s *PostgresStore) CreateSolicitacao(ctx context.Context, conta *domain.Conta, req domain.SolicitacaoCreateRequest) (*domain.Solicitacao, error) {
	tx, err := s.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer rollbackQuietly(ctx, tx)

	categoriaNome, ok, err := categoriaAtivaByID(ctx, tx, req.CategoriaID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrCategoriaInvalida
	}

	now := time.Now().UTC()
	insertSolicitacao := `
		INSERT INTO solicitacoes (
			filial, categoria_id, titulo, solicitante_nome, descricao, onde_vai_ser_usado,
			valor_estimado, fornecedor, forma_pagamento, observacoes, status, criado_em, enviado_em
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id
	`
	var id int64
	err = tx.QueryRow(ctx, insertSolicitacao,
		strings.TrimSpace(conta.Filial),
		req.CategoriaID,
		strings.TrimSpace(req.Titulo),
		strings.TrimSpace(req.SolicitanteNome),
		strings.TrimSpace(req.Descricao),
		strings.TrimSpace(req.OndeVaiSerUsado),
		req.ValorEstimado,
		domain.NormalizeOptionalString(req.Fornecedor),
		domain.NormalizeOptionalString(req.FormaPagamento),
		domain.NormalizeOptionalString(req.Observacoes),
		domain.StatusPendente,
		now,
		now,
	).Scan(&id)
	if err != nil {
		return nil, err
	}

	if err := insertLinhas(ctx, tx, id, req.Linhas); err != nil {
		return nil, err
	}
	if err := insertHistorico(ctx, tx, id, string(conta.Tipo), "CRIADA", nil); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	solicitacao, err := s.GetSolicitacaoByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if solicitacao != nil {
		solicitacao.CategoriaNome = categoriaNome
	}
	return solicitacao, nil
}

func (s *PostgresStore) ReenviarSolicitacao(ctx context.Context, conta *domain.Conta, id int64, req domain.SolicitacaoReenvioRequest) (*domain.Solicitacao, error) {
	tx, err := s.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer rollbackQuietly(ctx, tx)

	current, err := getSolicitacaoOwnerAndStatus(ctx, tx, id)
	if err != nil {
		return nil, err
	}
	if current == nil {
		return nil, ErrSolicitacaoNaoEncontrada
	}
	if !strings.EqualFold(strings.TrimSpace(current.Filial), strings.TrimSpace(conta.Filial)) {
		return nil, ErrSolicitacaoSemPermissao
	}
	if current.Status != domain.StatusPendenteInfo {
		return nil, ErrSolicitacaoStatusInvalido
	}

	_, ok, err := categoriaAtivaByID(ctx, tx, req.Dados.CategoriaID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrCategoriaInvalida
	}

	now := time.Now().UTC()
	updateQuery := `
		UPDATE solicitacoes
		SET categoria_id = $2,
		    titulo = $3,
		    solicitante_nome = $4,
		    descricao = $5,
		    onde_vai_ser_usado = $6,
		    valor_estimado = $7,
		    fornecedor = $8,
		    forma_pagamento = $9,
		    observacoes = $10,
		    status = $11,
		    enviado_em = $12,
		    decidido_em = NULL,
		    valor_aprovado = NULL
		WHERE id = $1
	`
	_, err = tx.Exec(ctx, updateQuery,
		id,
		req.Dados.CategoriaID,
		strings.TrimSpace(req.Dados.Titulo),
		strings.TrimSpace(req.Dados.SolicitanteNome),
		strings.TrimSpace(req.Dados.Descricao),
		strings.TrimSpace(req.Dados.OndeVaiSerUsado),
		req.Dados.ValorEstimado,
		domain.NormalizeOptionalString(req.Dados.Fornecedor),
		domain.NormalizeOptionalString(req.Dados.FormaPagamento),
		domain.NormalizeOptionalString(req.Dados.Observacoes),
		domain.StatusPendente,
		now,
	)
	if err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, "DELETE FROM solicitacao_linhas WHERE solicitacao_id = $1", id); err != nil {
		return nil, err
	}
	if err := insertLinhas(ctx, tx, id, req.Dados.Linhas); err != nil {
		return nil, err
	}
	if err := insertHistorico(ctx, tx, id, string(conta.Tipo), "REENVIADA", domain.NormalizeOptionalString(req.Comentario)); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.GetSolicitacaoByID(ctx, id)
}

func (s *PostgresStore) listSolicitacoes(ctx context.Context, filters listFilters) (domain.PageResponse[domain.Solicitacao], error) {
	page := max(0, filters.Page)
	size := sanitizeSize(filters.Size)
	orderBy := resolveSort(filters.SortKey)

	var where []string
	var args []any

	if filters.Filial != nil {
		args = append(args, *filters.Filial)
		where = append(where, fmt.Sprintf("s.filial = $%d", len(args)))
	}
	if len(filters.VisibleFiliais) > 0 {
		args = append(args, filters.VisibleFiliais)
		where = append(where, fmt.Sprintf("lower(s.filial) = ANY($%d)", len(args)))
	}
	if filters.Status != nil {
		args = append(args, *filters.Status)
		where = append(where, fmt.Sprintf("s.status = $%d", len(args)))
	}

	searchClause, searchArgs := buildSearchClause(filters)
	if searchClause != "" {
		baseOffset := len(args)
		for idx := range searchArgs {
			searchClause = strings.ReplaceAll(searchClause, fmt.Sprintf("$%d", idx+1), fmt.Sprintf("$%d", baseOffset+idx+1))
		}
		args = append(args, searchArgs...)
		where = append(where, searchClause)
	}

	whereSQL := ""
	if len(where) > 0 {
		whereSQL = " WHERE " + strings.Join(where, " AND ")
	}

	countQuery := "SELECT COUNT(1) FROM solicitacoes s JOIN categorias c ON c.id = s.categoria_id" + whereSQL
	var total int64
	if err := s.Pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return domain.PageResponse[domain.Solicitacao]{}, err
	}
	if total == 0 {
		return domain.PageResponse[domain.Solicitacao]{
			Items:         []domain.Solicitacao{},
			Page:          page,
			Size:          size,
			TotalElements: 0,
			TotalPages:    0,
		}, nil
	}

	args = append(args, size, page*size)
	selectQuery := baseSolicitacaoSelect() + whereSQL + " ORDER BY " + orderBy +
		fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)-1, len(args))
	rows, err := s.scanSolicitacoes(ctx, selectQuery, args)
	if err != nil {
		return domain.PageResponse[domain.Solicitacao]{}, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(size)))
	return domain.PageResponse[domain.Solicitacao]{
		Items:         rows,
		Page:          page,
		Size:          size,
		TotalElements: total,
		TotalPages:    totalPages,
	}, nil
}

func (s *PostgresStore) scanSolicitacoes(ctx context.Context, query string, args []any) ([]domain.Solicitacao, error) {
	rows, err := s.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	solicitacoes := make([]domain.Solicitacao, 0)
	ids := make([]int64, 0)
	for rows.Next() {
		var it domain.Solicitacao
		var valorAprovado *float64
		var fornecedor *string
		var formaPagamento *string
		var observacoes *string
		var decididoEm *time.Time
		var comentarioDecisao *string
		if err := rows.Scan(
			&it.ID,
			&it.Filial,
			&it.CategoriaID,
			&it.CategoriaNome,
			&it.Titulo,
			&it.SolicitanteNome,
			&it.Descricao,
			&it.OndeVaiSerUsado,
			&it.ValorEstimado,
			&valorAprovado,
			&fornecedor,
			&formaPagamento,
			&observacoes,
			&it.Status,
			&it.EnviadoEm,
			&decididoEm,
			&comentarioDecisao,
		); err != nil {
			return nil, err
		}
		it.ValorAprovado = valorAprovado
		it.Fornecedor = fornecedor
		it.FormaPagamento = formaPagamento
		it.Observacoes = observacoes
		it.DecididoEm = decididoEm
		it.ComentarioDecisao = comentarioDecisao
		it.Linhas = []domain.SolicitacaoLinha{}
		it.Historico = []domain.SolicitacaoHistorico{}
		solicitacoes = append(solicitacoes, it)
		ids = append(ids, it.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(solicitacoes) == 0 {
		return solicitacoes, nil
	}

	linhasByID, err := s.loadLinhasBySolicitacao(ctx, ids)
	if err != nil {
		return nil, err
	}
	historicoByID, err := s.loadHistoricoBySolicitacao(ctx, ids)
	if err != nil {
		return nil, err
	}

	for idx := range solicitacoes {
		id := solicitacoes[idx].ID
		solicitacoes[idx].Linhas = linhasByID[id]
		solicitacoes[idx].Historico = historicoByID[id]
	}
	return solicitacoes, nil
}

func (s *PostgresStore) loadLinhasBySolicitacao(ctx context.Context, ids []int64) (map[int64][]domain.SolicitacaoLinha, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT id, solicitacao_id, descricao, valor::float8, observacao
		FROM solicitacao_linhas
		WHERE solicitacao_id = ANY($1)
		ORDER BY id ASC
	`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[int64][]domain.SolicitacaoLinha, len(ids))
	for rows.Next() {
		var solicitacaoID int64
		var item domain.SolicitacaoLinha
		if err := rows.Scan(&item.ID, &solicitacaoID, &item.Descricao, &item.Valor, &item.Observacao); err != nil {
			return nil, err
		}
		out[solicitacaoID] = append(out[solicitacaoID], item)
	}
	return out, rows.Err()
}

func (s *PostgresStore) loadHistoricoBySolicitacao(ctx context.Context, ids []int64) (map[int64][]domain.SolicitacaoHistorico, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT id, solicitacao_id, ator, acao, comentario, criado_em
		FROM solicitacao_historico
		WHERE solicitacao_id = ANY($1)
		ORDER BY criado_em ASC, id ASC
	`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[int64][]domain.SolicitacaoHistorico, len(ids))
	for rows.Next() {
		var solicitacaoID int64
		var item domain.SolicitacaoHistorico
		if err := rows.Scan(&item.ID, &solicitacaoID, &item.Ator, &item.Acao, &item.Comentario, &item.CriadoEm); err != nil {
			return nil, err
		}
		out[solicitacaoID] = append(out[solicitacaoID], item)
	}
	return out, rows.Err()
}

func applySearchQuery(filters *listFilters, query string) {
	trimmed := strings.TrimSpace(query)
	if trimmed == "" {
		return
	}
	term := "%" + strings.ToLower(trimmed) + "%"
	filters.Term = term

	if id, err := strconv.ParseInt(trimmed, 10, 64); err == nil {
		filters.SearchID = &id
	}
	if status, ok := parseStatus(trimmed); ok {
		filters.SearchStatus = &status
	}
}

func buildSearchClause(filters listFilters) (string, []any) {
	if filters.Term == "" {
		return "", nil
	}
	args := []any{filters.Term}
	parts := []string{
		"lower(s.titulo) LIKE $1",
		"lower(s.descricao) LIKE $1",
		"lower(coalesce(s.fornecedor,'')) LIKE $1",
		"lower(coalesce(s.solicitante_nome,'')) LIKE $1",
		"lower(c.nome) LIKE $1",
	}
	if filters.Filial == nil {
		parts = append(parts, "lower(s.filial) LIKE $1")
	}
	if filters.SearchID != nil {
		args = append(args, *filters.SearchID)
		parts = append(parts, fmt.Sprintf("s.id = $%d", len(args)))
	}
	if filters.SearchStatus != nil {
		args = append(args, *filters.SearchStatus)
		parts = append(parts, fmt.Sprintf("s.status = $%d", len(args)))
	}
	return "(" + strings.Join(parts, " OR ") + ")", args
}

func resolveSort(sortKey string) string {
	switch strings.ToUpper(strings.TrimSpace(sortKey)) {
	case "OLD":
		return "s.enviado_em ASC NULLS LAST, s.id ASC"
	case "VALUE_DESC":
		return "s.valor_estimado DESC NULLS LAST, s.id DESC"
	case "VALUE_ASC":
		return "s.valor_estimado ASC NULLS LAST, s.id ASC"
	case "TITLE":
		return "lower(s.titulo) ASC NULLS LAST, s.id ASC"
	default:
		return "s.enviado_em DESC NULLS LAST, s.id DESC"
	}
}

func sanitizeSize(size int) int {
	if size <= 0 {
		return defaultPageSize
	}
	if size > maxPageSize {
		return maxPageSize
	}
	return size
}

func parseStatus(value string) (domain.StatusSolicitacao, bool) {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case string(domain.StatusPendente):
		return domain.StatusPendente, true
	case string(domain.StatusPendenteInfo):
		return domain.StatusPendenteInfo, true
	case string(domain.StatusAprovado):
		return domain.StatusAprovado, true
	case string(domain.StatusReprovado):
		return domain.StatusReprovado, true
	default:
		return "", false
	}
}

func baseSolicitacaoSelect() string {
	return `
		SELECT
			s.id,
			s.filial,
			s.categoria_id,
			c.nome AS categoria_nome,
			s.titulo,
			coalesce(s.solicitante_nome, '') AS solicitante_nome,
			s.descricao,
			s.onde_vai_ser_usado,
			s.valor_estimado::float8,
			CASE WHEN s.valor_aprovado IS NULL THEN NULL ELSE s.valor_aprovado::float8 END AS valor_aprovado,
			s.fornecedor,
			s.forma_pagamento,
			s.observacoes,
			s.status,
			s.enviado_em,
			s.decidido_em,
			s.comentario_decisao
		FROM solicitacoes s
		JOIN categorias c ON c.id = s.categoria_id
	`
}

func categoriaAtivaByID(ctx context.Context, q queryable, id int64) (string, bool, error) {
	const query = `SELECT nome, ativa FROM categorias WHERE id = $1 LIMIT 1`
	var nome string
	var ativa bool
	err := q.QueryRow(ctx, query, id).Scan(&nome, &ativa)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", false, nil
		}
		return "", false, err
	}
	return nome, ativa, nil
}

func getSolicitacaoOwnerAndStatus(ctx context.Context, q queryable, id int64) (*struct {
	Filial string
	Status domain.StatusSolicitacao
}, error) {
	const query = `SELECT filial, status FROM solicitacoes WHERE id = $1 LIMIT 1`
	var out struct {
		Filial string
		Status domain.StatusSolicitacao
	}
	err := q.QueryRow(ctx, query, id).Scan(&out.Filial, &out.Status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &out, nil
}

func insertLinhas(ctx context.Context, tx pgx.Tx, solicitacaoID int64, linhas []domain.SolicitacaoLinhaCreate) error {
	if len(linhas) == 0 {
		return nil
	}
	const query = `
		INSERT INTO solicitacao_linhas (solicitacao_id, descricao, valor, observacao)
		VALUES ($1, $2, $3, $4)
	`
	for _, linha := range linhas {
		_, err := tx.Exec(ctx, query,
			solicitacaoID,
			strings.TrimSpace(linha.Descricao),
			linha.Valor,
			domain.NormalizeOptionalString(linha.Observacao),
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func insertHistorico(ctx context.Context, tx pgx.Tx, solicitacaoID int64, ator, acao string, comentario *string) error {
	const query = `
		INSERT INTO solicitacao_historico (solicitacao_id, ator, acao, comentario, criado_em)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := tx.Exec(ctx, query,
		solicitacaoID,
		strings.TrimSpace(ator),
		strings.TrimSpace(acao),
		domain.NormalizeOptionalString(comentario),
		time.Now().UTC(),
	)
	return err
}

func normalizeFiliais(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		key := strings.ToLower(strings.TrimSpace(value))
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, key)
	}
	return out
}

type queryable interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func rollbackQuietly(ctx context.Context, tx pgx.Tx) {
	_ = tx.Rollback(ctx)
}

var (
	ErrCategoriaInvalida         = errors.New("categoria_invalida")
	ErrSolicitacaoNaoEncontrada  = errors.New("solicitacao_nao_encontrada")
	ErrSolicitacaoSemPermissao   = errors.New("solicitacao_sem_permissao")
	ErrSolicitacaoStatusInvalido = errors.New("solicitacao_status_invalido")
)

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
