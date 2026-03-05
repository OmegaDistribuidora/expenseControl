package domain

import "time"

type StatusSolicitacao string

const (
	StatusPendente     StatusSolicitacao = "PENDENTE"
	StatusPendenteInfo StatusSolicitacao = "PENDENTE_INFO"
	StatusAprovado     StatusSolicitacao = "APROVADO"
	StatusReprovado    StatusSolicitacao = "REPROVADO"
)

var StatusesSolicitacao = []StatusSolicitacao{
	StatusPendente,
	StatusPendenteInfo,
	StatusAprovado,
	StatusReprovado,
}

type Solicitacao struct {
	ID                int64                  `json:"id"`
	Filial            string                 `json:"filial"`
	CategoriaID       int64                  `json:"categoriaId"`
	CategoriaNome     string                 `json:"categoriaNome"`
	Titulo            string                 `json:"titulo"`
	SolicitanteNome   string                 `json:"solicitanteNome"`
	Descricao         string                 `json:"descricao"`
	OndeVaiSerUsado   string                 `json:"ondeVaiSerUsado"`
	ValorEstimado     float64                `json:"valorEstimado"`
	ValorAprovado     *float64               `json:"valorAprovado"`
	Fornecedor        *string                `json:"fornecedor"`
	FormaPagamento    *string                `json:"formaPagamento"`
	Observacoes       *string                `json:"observacoes"`
	Status            StatusSolicitacao      `json:"status"`
	EnviadoEm         time.Time              `json:"enviadoEm"`
	DecididoEm        *time.Time             `json:"decididoEm"`
	ComentarioDecisao *string                `json:"comentarioDecisao"`
	Linhas            []SolicitacaoLinha     `json:"linhas"`
	Historico         []SolicitacaoHistorico `json:"historico"`
}

type SolicitacaoLinha struct {
	ID         int64   `json:"id"`
	Descricao  string  `json:"descricao"`
	Valor      float64 `json:"valor"`
	Observacao *string `json:"observacao"`
}

type SolicitacaoHistorico struct {
	ID         int64     `json:"id"`
	Ator       string    `json:"ator"`
	Acao       string    `json:"acao"`
	Comentario *string   `json:"comentario"`
	CriadoEm   time.Time `json:"criadoEm"`
}

type SolicitacaoCreateRequest struct {
	CategoriaID     int64                    `json:"categoriaId"`
	Titulo          string                   `json:"titulo"`
	SolicitanteNome string                   `json:"solicitanteNome"`
	Descricao       string                   `json:"descricao"`
	OndeVaiSerUsado string                   `json:"ondeVaiSerUsado"`
	ValorEstimado   float64                  `json:"valorEstimado"`
	Fornecedor      *string                  `json:"fornecedor"`
	FormaPagamento  *string                  `json:"formaPagamento"`
	Observacoes     *string                  `json:"observacoes"`
	Linhas          []SolicitacaoLinhaCreate `json:"linhas"`
}

type SolicitacaoLinhaCreate struct {
	Descricao  string  `json:"descricao"`
	Valor      float64 `json:"valor"`
	Observacao *string `json:"observacao"`
}

type SolicitacaoReenvioRequest struct {
	Dados      SolicitacaoCreateRequest `json:"dados"`
	Comentario *string                  `json:"comentario"`
}

type PageResponse[T any] struct {
	Items         []T   `json:"items"`
	Page          int   `json:"page"`
	Size          int   `json:"size"`
	TotalElements int64 `json:"totalElements"`
	TotalPages    int   `json:"totalPages"`
}

type SolicitacaoBreakdown struct {
	Label      string  `json:"label"`
	Total      int64   `json:"total"`
	ValorTotal float64 `json:"valorTotal"`
}

type SolicitacaoStatusResumo struct {
	Status StatusSolicitacao `json:"status"`
	Total  int64             `json:"total"`
}

type SolicitacaoStats struct {
	TotalAprovadas     int64                     `json:"totalAprovadas"`
	ValorTotalAprovado float64                   `json:"valorTotalAprovado"`
	PorCategoria       []SolicitacaoBreakdown    `json:"porCategoria"`
	PorFilial          []SolicitacaoBreakdown    `json:"porFilial"`
	PorStatus          []SolicitacaoStatusResumo `json:"porStatus"`
}

type Attachment struct {
	ID            int64     `json:"id"`
	SolicitacaoID int64     `json:"solicitacaoId"`
	DriveFileID   string    `json:"-"`
	DriveFolderID *string   `json:"driveFolderId"`
	OriginalName  string    `json:"originalName"`
	StoredName    string    `json:"storedName"`
	ContentType   string    `json:"contentType"`
	Size          int64     `json:"size"`
	UploadedBy    string    `json:"uploadedBy"`
	CreatedAt     time.Time `json:"createdAt"`
}

type ContaResumo struct {
	Usuario                string   `json:"usuario"`
	Nome                   string   `json:"nome"`
	Tipo                   string   `json:"tipo"`
	Filial                 *string  `json:"filial"`
	Ativo                  bool     `json:"ativo"`
	PodeAprovarSolicitacao bool     `json:"podeAprovarSolicitacao"`
	FiliaisVisiveis        []string `json:"filiaisVisiveis"`
	SuperAdmin             bool     `json:"superAdmin"`
}

type AuditoriaEvento struct {
	ID              int64     `json:"id"`
	Usuario         string    `json:"usuario"`
	TipoConta       string    `json:"tipoConta"`
	Acao            string    `json:"acao"`
	ReferenciaTipo  *string   `json:"referenciaTipo"`
	ReferenciaID    *string   `json:"referenciaId"`
	Detalhe         string    `json:"detalhe"`
	DetalheCompleto *string   `json:"detalheCompleto"`
	CriadoEm        time.Time `json:"criadoEm"`
}
