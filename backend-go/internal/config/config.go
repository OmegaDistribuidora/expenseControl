package config

import (
	"fmt"
	"net/url"
	"os"
	"strings"
)

type Config struct {
	Port                 string
	CORSAllowedOrigins   []string
	AttachmentsLocalRoot string
	SeedDefaultUsers     bool
	DatabaseURL          string
	PGHost               string
	PGPort               string
	PGDatabase           string
	PGUser               string
	PGPassword           string
	PGSSLMode            string
}

func Load() Config {
	return Config{
		Port:                 env("PORT", "8080"),
		CORSAllowedOrigins:   splitCSV(env("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173")),
		AttachmentsLocalRoot: env("ATTACHMENTS_LOCAL_ROOT", "/solicitacoes"),
		SeedDefaultUsers:     envBool("SEED_DEFAULT_USERS", true),
		DatabaseURL:          strings.TrimSpace(os.Getenv("DATABASE_URL")),
		PGHost:               env("PGHOST", "localhost"),
		PGPort:               env("PGPORT", "5432"),
		PGDatabase:           env("PGDATABASE", "expense_control"),
		PGUser:               env("PGUSER", "postgres"),
		PGPassword:           os.Getenv("PGPASSWORD"),
		PGSSLMode:            env("PGSSLMODE", "disable"),
	}
}

func (c Config) Addr() string {
	port := strings.TrimSpace(c.Port)
	if port == "" {
		port = "8080"
	}
	return ":" + port
}

func (c Config) DatabaseConnString() (string, error) {
	if c.DatabaseURL != "" {
		return normalizeDatabaseURL(c.DatabaseURL)
	}

	u := &url.URL{
		Scheme: "postgres",
		Host:   fmt.Sprintf("%s:%s", c.PGHost, c.PGPort),
		Path:   "/" + c.PGDatabase,
	}

	if c.PGPassword != "" {
		u.User = url.UserPassword(c.PGUser, c.PGPassword)
	} else {
		u.User = url.User(c.PGUser)
	}

	q := u.Query()
	q.Set("sslmode", c.PGSSLMode)
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func normalizeDatabaseURL(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if strings.HasPrefix(trimmed, "jdbc:postgresql://") {
		return strings.TrimPrefix(trimmed, "jdbc:"), nil
	}
	if strings.HasPrefix(trimmed, "postgres://") || strings.HasPrefix(trimmed, "postgresql://") {
		return trimmed, nil
	}
	return "", fmt.Errorf("DATABASE_URL invalida: use postgres:// ou postgresql://")
}

func splitCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		out = append(out, trimmed)
	}
	return out
}

func env(name, fallback string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value != "" {
		return value
	}
	return fallback
}

func envBool(name string, fallback bool) bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(name)))
	if value == "" {
		return fallback
	}
	switch value {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	default:
		return fallback
	}
}
