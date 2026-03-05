package permissions

import (
	"strings"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
)

const rootAdminUser = "admin"

func IsRootAdmin(conta *domain.Conta) bool {
	if conta == nil {
		return false
	}
	return conta.Tipo == domain.TipoContaAdmin && strings.EqualFold(strings.TrimSpace(conta.Usuario), rootAdminUser)
}

func CanApproveSolicitacao(conta *domain.Conta) bool {
	if IsRootAdmin(conta) {
		return true
	}
	if conta == nil || conta.Tipo != domain.TipoContaAdmin {
		return false
	}
	return conta.PodeAprovarSolicitacao
}

func VisibleFiliaisList(conta *domain.Conta) []string {
	if conta == nil {
		return []string{}
	}
	raw := strings.TrimSpace(conta.FiliaisVisiveis)
	if raw == "" {
		return []string{}
	}
	parts := strings.Split(raw, ",")
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

func CanViewFilial(conta *domain.Conta, filial string) bool {
	if conta == nil || strings.TrimSpace(filial) == "" {
		return false
	}
	if IsRootAdmin(conta) {
		return true
	}
	if conta.Tipo == domain.TipoContaFilial {
		return strings.EqualFold(strings.TrimSpace(conta.Filial), strings.TrimSpace(filial))
	}
	if conta.Tipo != domain.TipoContaAdmin {
		return false
	}
	target := strings.ToLower(strings.TrimSpace(filial))
	for _, visible := range VisibleFiliaisList(conta) {
		if strings.ToLower(strings.TrimSpace(visible)) == target {
			return true
		}
	}
	return false
}
