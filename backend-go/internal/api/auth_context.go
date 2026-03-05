package api

import (
	"context"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
)

type authContextKey string

const contaKey authContextKey = "conta"

func WithConta(ctx context.Context, conta *domain.Conta) context.Context {
	return context.WithValue(ctx, contaKey, conta)
}

func ContaFromContext(ctx context.Context) (*domain.Conta, bool) {
	raw := ctx.Value(contaKey)
	conta, ok := raw.(*domain.Conta)
	if !ok || conta == nil {
		return nil, false
	}
	return conta, true
}
