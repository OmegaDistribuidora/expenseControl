package store

import (
	"context"
	"errors"
	"strings"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

type CriarContaInput struct {
	Usuario                string   `json:"usuario"`
	Nome                   string   `json:"nome"`
	Senha                  string   `json:"senha"`
	PodeAprovarSolicitacao bool     `json:"podeAprovarSolicitacao"`
	FiliaisVisiveis        []string `json:"filiaisVisiveis"`
}

type AlterarSenhaInput struct {
	NovaSenha  string  `json:"novaSenha"`
	SenhaAtual *string `json:"senhaAtual"`
}

type AlterarSenhaOutput struct {
	Usuario  string `json:"usuario"`
	Mensagem string `json:"mensagem"`
}

func (s *PostgresStore) CriarContaAdmin(ctx context.Context, input CriarContaInput) (*domain.ContaResumo, error) {
	usuario := strings.ToLower(strings.TrimSpace(input.Usuario))
	nome := strings.TrimSpace(input.Nome)
	senha := strings.TrimSpace(input.Senha)
	if usuario == "" {
		return nil, ErrUsuarioObrigatorio
	}
	if nome == "" {
		return nil, ErrNomeObrigatorio
	}
	if len(senha) < 6 {
		return nil, ErrSenhaCurta
	}

	filiaisDisponiveis, err := s.ListFiliaisDisponiveis(ctx)
	if err != nil {
		return nil, err
	}
	filiais := sanitizeFiliais(input.FiliaisVisiveis, filiaisDisponiveis)
	if len(filiais) == 0 {
		return nil, ErrFiliaisObrigatorias
	}

	existing, err := s.FindContaByUsuario(ctx, usuario)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrUsuarioExistente
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(senha), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	_, err = s.Pool.Exec(ctx, `
		INSERT INTO contas (nome, usuario, senha_hash, tipo, filial, filiais_visiveis, pode_aprovar_solicitacao, ativo)
		VALUES ($1,$2,$3,'ADMIN',NULL,$4,$5,true)
	`, nome, usuario, string(hash), strings.Join(filiais, ","), input.PodeAprovarSolicitacao)
	if err != nil {
		return nil, err
	}

	return &domain.ContaResumo{
		Usuario:                usuario,
		Nome:                   nome,
		Tipo:                   "ADMIN",
		Filial:                 nil,
		Ativo:                  true,
		PodeAprovarSolicitacao: input.PodeAprovarSolicitacao,
		FiliaisVisiveis:        filiais,
		SuperAdmin:             strings.EqualFold(usuario, "admin"),
	}, nil
}

func (s *PostgresStore) AlterarSenha(ctx context.Context, actor *domain.Conta, usuario string, input AlterarSenhaInput, isRootAdmin bool) (AlterarSenhaOutput, error) {
	targetUser := strings.TrimSpace(usuario)
	if targetUser == "" {
		return AlterarSenhaOutput{}, ErrUsuarioObrigatorio
	}
	novaSenha := strings.TrimSpace(input.NovaSenha)
	if len(novaSenha) < 6 {
		return AlterarSenhaOutput{}, ErrSenhaCurta
	}

	target, err := s.FindContaByUsuario(ctx, targetUser)
	if err != nil {
		return AlterarSenhaOutput{}, err
	}
	if target == nil {
		return AlterarSenhaOutput{}, ErrUsuarioNaoEncontrado
	}

	isOwnPassword := strings.EqualFold(strings.TrimSpace(actor.Usuario), strings.TrimSpace(target.Usuario))
	if !isOwnPassword && !isRootAdmin {
		return AlterarSenhaOutput{}, ErrSemPermissao
	}
	if isOwnPassword {
		if input.SenhaAtual == nil || strings.TrimSpace(*input.SenhaAtual) == "" {
			return AlterarSenhaOutput{}, ErrSenhaAtualObrigatoria
		}
		if err := bcrypt.CompareHashAndPassword([]byte(target.SenhaHash), []byte(strings.TrimSpace(*input.SenhaAtual))); err != nil {
			return AlterarSenhaOutput{}, ErrSenhaAtualInvalida
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(novaSenha), bcrypt.DefaultCost)
	if err != nil {
		return AlterarSenhaOutput{}, err
	}
	_, err = s.Pool.Exec(ctx, `UPDATE contas SET senha_hash = $2 WHERE usuario = $1`, target.Usuario, string(hash))
	if err != nil {
		return AlterarSenhaOutput{}, err
	}

	return AlterarSenhaOutput{
		Usuario:  target.Usuario,
		Mensagem: "Senha alterada com sucesso.",
	}, nil
}

func sanitizeFiliais(raw []string, allowed []string) []string {
	if len(raw) == 0 || len(allowed) == 0 {
		return nil
	}
	allowedByKey := map[string]string{}
	for _, item := range allowed {
		key := strings.ToLower(strings.TrimSpace(item))
		if key == "" {
			continue
		}
		if _, ok := allowedByKey[key]; !ok {
			allowedByKey[key] = strings.TrimSpace(item)
		}
	}

	out := make([]string, 0)
	seen := map[string]struct{}{}
	for _, item := range raw {
		key := strings.ToLower(strings.TrimSpace(item))
		if key == "" {
			continue
		}
		match, ok := allowedByKey[key]
		if !ok {
			continue
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, match)
	}
	return out
}

var (
	ErrUsuarioObrigatorio    = errors.New("usuario_obrigatorio")
	ErrNomeObrigatorio       = errors.New("nome_obrigatorio")
	ErrSenhaCurta            = errors.New("senha_curta")
	ErrFiliaisObrigatorias   = errors.New("filiais_obrigatorias")
	ErrUsuarioExistente      = errors.New("usuario_existente")
	ErrUsuarioNaoEncontrado  = errors.New("usuario_nao_encontrado")
	ErrSemPermissao          = errors.New("sem_permissao")
	ErrSenhaAtualObrigatoria = errors.New("senha_atual_obrigatoria")
	ErrSenhaAtualInvalida    = errors.New("senha_atual_invalida")
)
