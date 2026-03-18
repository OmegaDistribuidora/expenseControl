package security

import (
	"errors"
	"strings"
	"time"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
	"github.com/golang-jwt/jwt/v5"
)

type LocalAuthClaims struct {
	Usuario string `json:"usuario"`
	jwt.RegisteredClaims
}

type EcosystemSsoClaims struct {
	EcosystemUserID   int64  `json:"ecosystemUserId,omitempty"`
	EcosystemUsername string `json:"ecosystemUsername,omitempty"`
	TargetLogin       string `json:"targetLogin"`
	SystemID          int64  `json:"systemId,omitempty"`
	jwt.RegisteredClaims
}

func IssueLocalToken(secret string, conta *domain.Conta) (string, error) {
	if strings.TrimSpace(secret) == "" {
		return "", errors.New("auth token secret vazio")
	}
	if conta == nil || strings.TrimSpace(conta.Usuario) == "" {
		return "", errors.New("conta invalida")
	}

	now := time.Now()
	claims := LocalAuthClaims{
		Usuario: conta.Usuario,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   conta.Usuario,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now.Add(-5 * time.Second)),
			ExpiresAt: jwt.NewNumericDate(now.Add(12 * time.Hour)),
		},
	}

	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

func ParseLocalToken(secret, token string) (*LocalAuthClaims, error) {
	claims := &LocalAuthClaims{}
	_, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return nil, err
	}
	return claims, nil
}

func ParseEcosystemSsoToken(secret, issuer, audience, token string) (*EcosystemSsoClaims, error) {
	claims := &EcosystemSsoClaims{}
	_, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(issuer),
		jwt.WithAudience(audience),
	)
	if err != nil {
		return nil, err
	}
	return claims, nil
}
