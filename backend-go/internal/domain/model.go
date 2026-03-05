package domain

type TipoConta string

const (
	TipoContaAdmin  TipoConta = "ADMIN"
	TipoContaFilial TipoConta = "FILIAL"
)

type Conta struct {
	ID                     int64
	Nome                   string
	Usuario                string
	SenhaHash              string
	Tipo                   TipoConta
	Filial                 string
	FiliaisVisiveis        string
	PodeAprovarSolicitacao bool
	Ativo                  bool
}

type Categoria struct {
	ID        int64   `json:"id"`
	Nome      string  `json:"nome"`
	Descricao *string `json:"descricao"`
	Ativa     bool    `json:"ativa"`
}
