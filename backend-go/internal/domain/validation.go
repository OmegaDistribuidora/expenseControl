package domain

import (
	"strings"
)

func ValidateSolicitacaoCreate(req SolicitacaoCreateRequest) string {
	if req.CategoriaID <= 0 {
		return "categoriaId obrigatorio."
	}
	if strings.TrimSpace(req.Titulo) == "" {
		return "titulo obrigatorio."
	}
	if len(strings.TrimSpace(req.Titulo)) > 120 {
		return "titulo deve ter no maximo 120 caracteres."
	}
	if strings.TrimSpace(req.SolicitanteNome) == "" {
		return "solicitanteNome obrigatorio."
	}
	if len(strings.TrimSpace(req.SolicitanteNome)) > 120 {
		return "solicitanteNome deve ter no maximo 120 caracteres."
	}
	if strings.TrimSpace(req.Descricao) == "" {
		return "descricao obrigatoria."
	}
	if len(strings.TrimSpace(req.Descricao)) > 2000 {
		return "descricao deve ter no maximo 2000 caracteres."
	}
	if strings.TrimSpace(req.OndeVaiSerUsado) == "" {
		return "ondeVaiSerUsado obrigatorio."
	}
	if len(strings.TrimSpace(req.OndeVaiSerUsado)) > 255 {
		return "ondeVaiSerUsado deve ter no maximo 255 caracteres."
	}
	if req.ValorEstimado <= 0 {
		return "valorEstimado deve ser maior que zero."
	}
	if req.Fornecedor != nil && len(strings.TrimSpace(*req.Fornecedor)) > 120 {
		return "fornecedor deve ter no maximo 120 caracteres."
	}
	if req.FormaPagamento != nil && len(strings.TrimSpace(*req.FormaPagamento)) > 50 {
		return "formaPagamento deve ter no maximo 50 caracteres."
	}
	if req.Observacoes != nil && len(strings.TrimSpace(*req.Observacoes)) > 1000 {
		return "observacoes deve ter no maximo 1000 caracteres."
	}
	for _, linha := range req.Linhas {
		if strings.TrimSpace(linha.Descricao) == "" {
			return "descricao da linha obrigatoria."
		}
		if len(strings.TrimSpace(linha.Descricao)) > 160 {
			return "descricao da linha deve ter no maximo 160 caracteres."
		}
		if linha.Valor <= 0 {
			return "valor da linha deve ser maior que zero."
		}
		if linha.Observacao != nil && len(strings.TrimSpace(*linha.Observacao)) > 300 {
			return "observacao da linha deve ter no maximo 300 caracteres."
		}
	}
	return ""
}

func NormalizeOptionalString(input *string) *string {
	if input == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*input)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
