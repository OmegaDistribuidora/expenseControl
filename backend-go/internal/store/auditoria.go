package store

import (
	"context"
	"strings"
	"time"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
)

type AuditoriaInput struct {
	Usuario         string
	TipoConta       string
	Acao            string
	ReferenciaTipo  *string
	ReferenciaID    *string
	Detalhe         string
	DetalheCompleto *string
}

func (s *PostgresStore) RegistrarAuditoria(ctx context.Context, input AuditoriaInput) error {
	usuario := limitText(strings.TrimSpace(input.Usuario), 120)
	if usuario == "" {
		usuario = "sistema"
	}
	tipoConta := limitText(strings.TrimSpace(input.TipoConta), 30)
	if tipoConta == "" {
		tipoConta = "SISTEMA"
	}
	acao := strings.ToUpper(strings.TrimSpace(input.Acao))
	if acao == "" {
		acao = "ACAO"
	}
	acao = limitText(acao, 80)

	detalhe := strings.TrimSpace(input.Detalhe)
	if detalhe == "" {
		detalhe = "Sem detalhes."
	}
	detalhe = limitText(detalhe, 2000)

	var detalheCompleto *string
	if input.DetalheCompleto != nil {
		text := strings.TrimSpace(*input.DetalheCompleto)
		if text != "" {
			limited := limitText(text, 20000)
			detalheCompleto = &limited
		}
	}
	if detalheCompleto == nil {
		copyText := detalhe
		detalheCompleto = &copyText
	}

	_, err := s.Pool.Exec(ctx, `
		INSERT INTO auditoria_eventos (
			usuario, tipo_conta, acao, referencia_tipo, referencia_id, detalhe, detalhe_completo, criado_em
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
	`,
		usuario,
		tipoConta,
		acao,
		normalizeOptional(input.ReferenciaTipo, 60),
		normalizeOptional(input.ReferenciaID, 120),
		detalhe,
		detalheCompleto,
		time.Now().UTC(),
	)
	return err
}

func normalizeOptional(value *string, max int) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	limited := limitText(trimmed, max)
	return &limited
}

func limitText(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max]
}

func contaTipoForAudit(conta *domain.Conta) string {
	if conta == nil {
		return "SISTEMA"
	}
	if strings.TrimSpace(string(conta.Tipo)) == "" {
		return "DESCONHECIDO"
	}
	return string(conta.Tipo)
}
