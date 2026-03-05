package store

import (
	"context"

	"golang.org/x/crypto/bcrypt"
)

type seedAccount struct {
	Nome    string
	Usuario string
	Senha   string
	Tipo    string
	Filial  *string
}

func (s *PostgresStore) SeedDefaultUsers(ctx context.Context) error {
	matrix := "Omega Matriz"
	barroso := "Omega Barroso"
	cariri := "Omega Cariri"
	sobral := "Omega Sobral"
	users := []seedAccount{
		{Nome: "Administrador", Usuario: "admin", Senha: "admin123", Tipo: "ADMIN", Filial: nil},
		{Nome: "Omega Matriz", Usuario: "omega.matriz", Senha: "filial123", Tipo: "FILIAL", Filial: &matrix},
		{Nome: "Omega Barroso", Usuario: "omega.barroso", Senha: "filial123", Tipo: "FILIAL", Filial: &barroso},
		{Nome: "Omega Cariri", Usuario: "omega.cariri", Senha: "filial123", Tipo: "FILIAL", Filial: &cariri},
		{Nome: "Omega Sobral", Usuario: "omega.sobral", Senha: "filial123", Tipo: "FILIAL", Filial: &sobral},
	}

	for _, user := range users {
		var exists bool
		if err := s.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM contas WHERE usuario = $1)`, user.Usuario).Scan(&exists); err != nil {
			return err
		}
		if exists {
			continue
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(user.Senha), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		_, err = s.Pool.Exec(ctx, `
			INSERT INTO contas (nome, usuario, senha_hash, tipo, filial, ativo)
			VALUES ($1,$2,$3,$4,$5,true)
		`, user.Nome, user.Usuario, string(hash), user.Tipo, user.Filial)
		if err != nil {
			return err
		}
	}
	return nil
}
