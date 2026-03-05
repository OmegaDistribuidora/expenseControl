package audit

import (
	"fmt"
	"strings"
	"time"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
)

func SolicitacaoResumo(s *domain.Solicitacao) string {
	if s == nil {
		return "Solicitacao sem dados."
	}
	return fmt.Sprintf(
		"Solicitacao #%d | Valor estimado: %s | Categoria: %s | Filial: %s | Titulo: %s",
		s.ID,
		formatCurrency(s.ValorEstimado),
		safe(s.CategoriaNome),
		safe(s.Filial),
		safe(s.Titulo),
	)
}

func SolicitacaoDetalheCompleto(acao string, s *domain.Solicitacao, anexos []domain.Attachment) string {
	if s == nil {
		return "Sem detalhes completos."
	}
	var b strings.Builder
	b.WriteString("Acao: ")
	b.WriteString(acao)
	b.WriteString("\n")
	b.WriteString(fmt.Sprintf("ID da solicitacao: %d\n", s.ID))
	b.WriteString("Empresa/Filial: " + safe(s.Filial) + "\n")
	b.WriteString("Categoria: " + safe(s.CategoriaNome) + "\n")
	b.WriteString("Titulo: " + safe(s.Titulo) + "\n")
	b.WriteString("Descricao: " + safe(s.Descricao) + "\n")
	b.WriteString("Onde vai ser usado: " + safe(s.OndeVaiSerUsado) + "\n")
	b.WriteString("Valor estimado: " + formatCurrency(s.ValorEstimado) + "\n")
	b.WriteString("Valor aprovado: " + formatCurrencyPtr(s.ValorAprovado) + "\n")
	b.WriteString("Solicitante: " + safe(s.SolicitanteNome) + "\n")
	b.WriteString("Fornecedor/Empresa: " + safePtr(s.Fornecedor) + "\n")
	b.WriteString("Forma de pagamento: " + safePtr(s.FormaPagamento) + "\n")
	b.WriteString("Observacoes: " + safePtr(s.Observacoes) + "\n")
	b.WriteString("Status: " + safe(string(s.Status)) + "\n")
	b.WriteString("Enviado em: " + formatDateTime(s.EnviadoEm) + "\n")
	b.WriteString("Decidido em: " + formatDateTimePtr(s.DecididoEm) + "\n")
	b.WriteString("Comentario decisao: " + safePtr(s.ComentarioDecisao) + "\n")

	b.WriteString("Itens:\n")
	if len(s.Linhas) == 0 {
		b.WriteString("  - Nenhum item.\n")
	} else {
		for _, linha := range s.Linhas {
			b.WriteString("  - Descricao: " + safe(linha.Descricao))
			b.WriteString(" | Valor: " + formatCurrency(linha.Valor))
			b.WriteString(" | Observacao: " + safePtr(linha.Observacao))
			b.WriteString("\n")
		}
	}

	b.WriteString("Anexos:\n")
	if len(anexos) == 0 {
		b.WriteString("  - Nenhum anexo.\n")
	} else {
		for _, anexo := range anexos {
			b.WriteString("  - Arquivo: " + safe(anexo.OriginalName))
			b.WriteString(" | Tamanho: " + formatBytes(anexo.Size))
			b.WriteString(" | Tipo: " + safe(anexo.ContentType))
			b.WriteString(" | Enviado por: " + safe(anexo.UploadedBy))
			b.WriteString(" | Data: " + formatDateTime(anexo.CreatedAt))
			b.WriteString("\n")
		}
	}
	return strings.TrimSpace(b.String())
}

func safe(value string) string {
	if strings.TrimSpace(value) == "" {
		return "-"
	}
	return strings.TrimSpace(value)
}

func safePtr(value *string) string {
	if value == nil {
		return "-"
	}
	return safe(*value)
}

func formatDateTime(value time.Time) string {
	if value.IsZero() {
		return "-"
	}
	return value.Format("02/01/2006 15:04:05")
}

func formatDateTimePtr(value *time.Time) string {
	if value == nil || value.IsZero() {
		return "-"
	}
	return value.Format("02/01/2006 15:04:05")
}

func formatCurrency(value float64) string {
	return fmt.Sprintf("R$ %.2f", value)
}

func formatCurrencyPtr(value *float64) string {
	if value == nil {
		return "-"
	}
	return formatCurrency(*value)
}

func formatBytes(size int64) string {
	if size < 1024 {
		return fmt.Sprintf("%d B", size)
	}
	kb := float64(size) / 1024.0
	if kb < 1024.0 {
		return fmt.Sprintf("%.1f KB", kb)
	}
	mb := kb / 1024.0
	return fmt.Sprintf("%.1f MB", mb)
}
