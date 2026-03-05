package store

import (
	"context"
	"fmt"
	"math"
	"strings"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
)

func (s *PostgresStore) ListContasResumo(ctx context.Context) ([]domain.ContaResumo, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT
			usuario,
			nome,
			tipo,
			filial,
			ativo,
			COALESCE(pode_aprovar_solicitacao, false) AS pode_aprovar_solicitacao,
			filiais_visiveis
		FROM contas
		ORDER BY tipo ASC, usuario ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.ContaResumo, 0)
	for rows.Next() {
		var item domain.ContaResumo
		var filiaisVisiveisRaw *string
		if err := rows.Scan(
			&item.Usuario,
			&item.Nome,
			&item.Tipo,
			&item.Filial,
			&item.Ativo,
			&item.PodeAprovarSolicitacao,
			&filiaisVisiveisRaw,
		); err != nil {
			return nil, err
		}
		item.FiliaisVisiveis = splitFiliais(filiaisVisiveisRaw)
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *PostgresStore) ListFiliaisDisponiveis(ctx context.Context) ([]string, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT filial
		FROM contas
		WHERE tipo = 'FILIAL'
		  AND filial IS NOT NULL
		  AND btrim(filial) <> ''
		ORDER BY filial ASC, usuario ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	seen := map[string]struct{}{}
	out := make([]string, 0)
	for rows.Next() {
		var filial string
		if err := rows.Scan(&filial); err != nil {
			return nil, err
		}
		key := strings.ToLower(strings.TrimSpace(filial))
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, strings.TrimSpace(filial))
	}
	return out, rows.Err()
}

func (s *PostgresStore) ListAuditoria(ctx context.Context, page, size int, query string) (domain.PageResponse[domain.AuditoriaEvento], error) {
	page = max(0, page)
	size = sanitizeSizeAuditoria(size)
	term := strings.TrimSpace(strings.ToLower(query))

	var args []any
	where := ""
	if term != "" {
		args = append(args, "%"+term+"%")
		where = `
			WHERE
				lower(coalesce(usuario,'')) LIKE $1
				OR lower(coalesce(tipo_conta,'')) LIKE $1
				OR lower(coalesce(acao,'')) LIKE $1
				OR lower(coalesce(detalhe,'')) LIKE $1
				OR lower(coalesce(detalhe_completo,'')) LIKE $1
				OR lower(coalesce(referencia_tipo,'')) LIKE $1
				OR lower(coalesce(referencia_id,'')) LIKE $1
		`
	}

	countQuery := "SELECT COUNT(1) FROM auditoria_eventos " + where
	var total int64
	if err := s.Pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return domain.PageResponse[domain.AuditoriaEvento]{}, err
	}
	if total == 0 {
		return domain.PageResponse[domain.AuditoriaEvento]{
			Items:         []domain.AuditoriaEvento{},
			Page:          page,
			Size:          size,
			TotalElements: 0,
			TotalPages:    0,
		}, nil
	}

	args = append(args, size, page*size)
	querySQL := fmt.Sprintf(`
		SELECT id, usuario, tipo_conta, acao, referencia_tipo, referencia_id, detalhe, detalhe_completo, criado_em
		FROM auditoria_eventos
		%s
		ORDER BY criado_em DESC NULLS LAST, id DESC
		LIMIT $%d OFFSET $%d
	`, where, len(args)-1, len(args))
	rows, err := s.Pool.Query(ctx, querySQL, args...)
	if err != nil {
		return domain.PageResponse[domain.AuditoriaEvento]{}, err
	}
	defer rows.Close()

	items := make([]domain.AuditoriaEvento, 0)
	for rows.Next() {
		var it domain.AuditoriaEvento
		if err := rows.Scan(
			&it.ID,
			&it.Usuario,
			&it.TipoConta,
			&it.Acao,
			&it.ReferenciaTipo,
			&it.ReferenciaID,
			&it.Detalhe,
			&it.DetalheCompleto,
			&it.CriadoEm,
		); err != nil {
			return domain.PageResponse[domain.AuditoriaEvento]{}, err
		}
		items = append(items, it)
	}
	if err := rows.Err(); err != nil {
		return domain.PageResponse[domain.AuditoriaEvento]{}, err
	}

	return domain.PageResponse[domain.AuditoriaEvento]{
		Items:         items,
		Page:          page,
		Size:          size,
		TotalElements: total,
		TotalPages:    int(math.Ceil(float64(total) / float64(size))),
	}, nil
}

func (s *PostgresStore) ListAttachmentsBySolicitacao(ctx context.Context, solicitacaoID int64) ([]domain.Attachment, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT id, solicitacao_id, drive_file_id, drive_folder_id, original_name, stored_name, content_type, size, uploaded_by, created_at
		FROM anexos
		WHERE solicitacao_id = $1
		ORDER BY created_at ASC, id ASC
	`, solicitacaoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]domain.Attachment, 0)
	for rows.Next() {
		var it domain.Attachment
		if err := rows.Scan(
			&it.ID,
			&it.SolicitacaoID,
			&it.DriveFileID,
			&it.DriveFolderID,
			&it.OriginalName,
			&it.StoredName,
			&it.ContentType,
			&it.Size,
			&it.UploadedBy,
			&it.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (s *PostgresStore) LoadStats(ctx context.Context, visibleFiliais []string, isRoot bool) (domain.SolicitacaoStats, error) {
	stats := domain.SolicitacaoStats{
		PorCategoria: []domain.SolicitacaoBreakdown{},
		PorFilial:    []domain.SolicitacaoBreakdown{},
		PorStatus:    []domain.SolicitacaoStatusResumo{},
	}

	filterFiliais := ""
	args := []any{}
	if !isRoot {
		filtered := normalizeFiliais(visibleFiliais)
		if len(filtered) == 0 {
			for _, status := range domain.StatusesSolicitacao {
				stats.PorStatus = append(stats.PorStatus, domain.SolicitacaoStatusResumo{Status: status, Total: 0})
			}
			return stats, nil
		}
		args = append(args, filtered)
		filterFiliais = fmt.Sprintf(" AND lower(s.filial) = ANY($%d)", len(args))
	}

	qAprovadas := "SELECT COUNT(1), COALESCE(SUM(COALESCE(s.valor_aprovado, s.valor_estimado)::float8),0) FROM solicitacoes s WHERE s.status = 'APROVADO'" + filterFiliais
	if err := s.Pool.QueryRow(ctx, qAprovadas, args...).Scan(&stats.TotalAprovadas, &stats.ValorTotalAprovado); err != nil {
		return stats, err
	}

	qCategoria := `
		SELECT c.nome, COUNT(1), COALESCE(SUM(COALESCE(s.valor_aprovado, s.valor_estimado)::float8),0)
		FROM solicitacoes s
		JOIN categorias c ON c.id = s.categoria_id
		WHERE s.status = 'APROVADO'` + filterFiliais + `
		GROUP BY c.nome
		ORDER BY SUM(COALESCE(s.valor_aprovado, s.valor_estimado)) DESC
	`
	rowsCat, err := s.Pool.Query(ctx, qCategoria, args...)
	if err != nil {
		return stats, err
	}
	for rowsCat.Next() {
		var it domain.SolicitacaoBreakdown
		if err := rowsCat.Scan(&it.Label, &it.Total, &it.ValorTotal); err != nil {
			rowsCat.Close()
			return stats, err
		}
		stats.PorCategoria = append(stats.PorCategoria, it)
	}
	rowsCat.Close()

	qFilial := `
		SELECT s.filial, COUNT(1), COALESCE(SUM(COALESCE(s.valor_aprovado, s.valor_estimado)::float8),0)
		FROM solicitacoes s
		WHERE s.status = 'APROVADO'` + filterFiliais + `
		GROUP BY s.filial
		ORDER BY SUM(COALESCE(s.valor_aprovado, s.valor_estimado)) DESC
	`
	rowsFilial, err := s.Pool.Query(ctx, qFilial, args...)
	if err != nil {
		return stats, err
	}
	for rowsFilial.Next() {
		var it domain.SolicitacaoBreakdown
		if err := rowsFilial.Scan(&it.Label, &it.Total, &it.ValorTotal); err != nil {
			rowsFilial.Close()
			return stats, err
		}
		stats.PorFilial = append(stats.PorFilial, it)
	}
	rowsFilial.Close()

	qStatus := "SELECT s.status, COUNT(1) FROM solicitacoes s WHERE 1=1" + filterFiliais + " GROUP BY s.status"
	rowsStatus, err := s.Pool.Query(ctx, qStatus, args...)
	if err != nil {
		return stats, err
	}
	counts := map[domain.StatusSolicitacao]int64{}
	for rowsStatus.Next() {
		var status domain.StatusSolicitacao
		var total int64
		if err := rowsStatus.Scan(&status, &total); err != nil {
			rowsStatus.Close()
			return stats, err
		}
		counts[status] = total
	}
	rowsStatus.Close()
	for _, status := range domain.StatusesSolicitacao {
		stats.PorStatus = append(stats.PorStatus, domain.SolicitacaoStatusResumo{
			Status: status,
			Total:  counts[status],
		})
	}
	return stats, nil
}

func sanitizeSizeAuditoria(size int) int {
	if size <= 0 {
		return 20
	}
	if size > 100 {
		return 100
	}
	return size
}

func splitFiliais(raw *string) []string {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return []string{}
	}
	parts := strings.Split(*raw, ",")
	out := make([]string, 0, len(parts))
	seen := map[string]struct{}{}
	for _, part := range parts {
		name := strings.TrimSpace(part)
		if name == "" {
			continue
		}
		key := strings.ToLower(name)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, name)
	}
	return out
}
