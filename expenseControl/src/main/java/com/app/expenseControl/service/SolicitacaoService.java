package com.app.expenseControl.service;

import com.app.expenseControl.dto.DecisaoSolicitacaoDTO;
import com.app.expenseControl.dto.SolicitacaoCreateDTO;
import com.app.expenseControl.dto.SolicitacaoHistoricoResponseDTO;
import com.app.expenseControl.dto.SolicitacaoLinhaCreateDTO;
import com.app.expenseControl.dto.SolicitacaoLinhaResponseDTO;
import com.app.expenseControl.dto.SolicitacaoPedidoInfoDTO;
import com.app.expenseControl.dto.SolicitacaoReenvioDTO;
import com.app.expenseControl.dto.SolicitacaoResponseDTO;
import com.app.expenseControl.entity.Categoria;
import com.app.expenseControl.entity.Conta;
import com.app.expenseControl.entity.Solicitacao;
import com.app.expenseControl.entity.SolicitacaoHistorico;
import com.app.expenseControl.entity.SolicitacaoLinha;
import com.app.expenseControl.enums.StatusSolicitacao;
import com.app.expenseControl.enums.TipoConta;
import com.app.expenseControl.repository.CategoriaRepository;
import com.app.expenseControl.repository.ContaRepository;
import com.app.expenseControl.repository.SolicitacaoHistoricoRepository;
import com.app.expenseControl.repository.SolicitacaoLinhaRepository;
import com.app.expenseControl.repository.SolicitacaoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SolicitacaoService {

    private static final String ACAO_CRIADA = "CRIADA";
    private static final String ACAO_PEDIDO_INFO = "PEDIDO_INFO";
    private static final String ACAO_REENVIADA = "REENVIADA";
    private static final String ACAO_APROVADA = "APROVADA";
    private static final String ACAO_REPROVADA = "REPROVADA";

    private final SolicitacaoRepository solicitacaoRepository;
    private final CategoriaRepository categoriaRepository;
    private final ContaRepository contaRepository;
    private final SolicitacaoLinhaRepository solicitacaoLinhaRepository;
    private final SolicitacaoHistoricoRepository solicitacaoHistoricoRepository;
    private final AttachmentService attachmentService;

    public SolicitacaoService(SolicitacaoRepository solicitacaoRepository,
                              CategoriaRepository categoriaRepository,
                              ContaRepository contaRepository,
                              SolicitacaoLinhaRepository solicitacaoLinhaRepository,
                              SolicitacaoHistoricoRepository solicitacaoHistoricoRepository,
                              AttachmentService attachmentService) {
        this.solicitacaoRepository = solicitacaoRepository;
        this.categoriaRepository = categoriaRepository;
        this.contaRepository = contaRepository;
        this.solicitacaoLinhaRepository = solicitacaoLinhaRepository;
        this.solicitacaoHistoricoRepository = solicitacaoHistoricoRepository;
        this.attachmentService = attachmentService;
    }

    @Transactional
    public SolicitacaoResponseDTO criar(SolicitacaoCreateDTO dto) {
        Conta conta = getContaLogada();
        ensureFilial(conta);

        Categoria categoria = categoriaRepository.findById(dto.categoriaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Categoria nao encontrada."));
        if (Boolean.FALSE.equals(categoria.getAtiva())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Categoria inativa.");
        }

        Solicitacao s = Solicitacao.builder()
                .filial(conta.getFilial())
                .categoria(categoria)
                .titulo(dto.titulo().trim())
                .solicitanteNome(dto.solicitanteNome().trim())
                .descricao(dto.descricao())
                .ondeVaiSerUsado(dto.ondeVaiSerUsado())
                .valorEstimado(dto.valorEstimado())
                .fornecedor(dto.fornecedor())
                .formaPagamento(dto.formaPagamento())
                .observacoes(dto.observacoes())
                .status(StatusSolicitacao.PENDENTE)
                .enviadoEm(LocalDateTime.now())
                .build();

        Solicitacao salva = solicitacaoRepository.save(s);
        List<SolicitacaoLinha> linhasSalvas = salvarLinhas(salva.getId(), dto.linhas());
        registrarHistorico(salva.getId(), conta.getTipo().name(), ACAO_CRIADA, null);

        List<SolicitacaoHistorico> historico = solicitacaoHistoricoRepository
                .findBySolicitacaoIdOrderByCriadoEmAsc(salva.getId());

        return toDTO(salva, linhasSalvas, historico);
    }

    @Transactional
    public SolicitacaoResponseDTO reenvio(Long id, SolicitacaoReenvioDTO dto) {
        Conta conta = getContaLogada();
        ensureFilial(conta);

        Solicitacao s = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitacao nao encontrada."));

        if (!conta.getFilial().equals(s.getFilial())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solicitacao nao pertence a filial.");
        }

        if (s.getStatus() != StatusSolicitacao.PENDENTE_INFO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solicitacao nao esta aguardando informacoes.");
        }

        Categoria categoria = categoriaRepository.findById(dto.dados().categoriaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Categoria nao encontrada."));
        if (Boolean.FALSE.equals(categoria.getAtiva())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Categoria inativa.");
        }

        s.setCategoria(categoria);
        s.setTitulo(dto.dados().titulo().trim());
        s.setSolicitanteNome(dto.dados().solicitanteNome().trim());
        s.setDescricao(dto.dados().descricao());
        s.setOndeVaiSerUsado(dto.dados().ondeVaiSerUsado());
        s.setValorEstimado(dto.dados().valorEstimado());
        s.setFornecedor(dto.dados().fornecedor());
        s.setFormaPagamento(dto.dados().formaPagamento());
        s.setObservacoes(dto.dados().observacoes());
        s.setStatus(StatusSolicitacao.PENDENTE);
        s.setEnviadoEm(LocalDateTime.now());
        s.setDecididoEm(null);
        s.setValorAprovado(null);

        Solicitacao salva = solicitacaoRepository.save(s);

        solicitacaoLinhaRepository.deleteBySolicitacaoId(salva.getId());
        List<SolicitacaoLinha> linhasSalvas = salvarLinhas(salva.getId(), dto.dados().linhas());

        registrarHistorico(salva.getId(), conta.getTipo().name(), ACAO_REENVIADA, dto.comentario());

        List<SolicitacaoHistorico> historico = solicitacaoHistoricoRepository
                .findBySolicitacaoIdOrderByCriadoEmAsc(salva.getId());

        return toDTO(salva, linhasSalvas, historico);
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoResponseDTO> listarDaFilial() {
        Conta conta = getContaLogada();
        ensureFilial(conta);

        List<Solicitacao> solicitacoes = solicitacaoRepository
                .findByFilialOrderByEnviadoEmDesc(conta.getFilial());

        return mapComLinhasEHistorico(solicitacoes);
    }

    @Transactional(readOnly = true)
    public SolicitacaoResponseDTO buscarDaFilial(Long id) {
        Conta conta = getContaLogada();
        ensureFilial(conta);

        Solicitacao s = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitacao nao encontrada."));

        if (!conta.getFilial().equals(s.getFilial())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solicitacao nao pertence a filial.");
        }

        List<SolicitacaoLinha> linhas = solicitacaoLinhaRepository.findBySolicitacaoId(s.getId());
        List<SolicitacaoHistorico> historico = solicitacaoHistoricoRepository
                .findBySolicitacaoIdOrderByCriadoEmAsc(s.getId());

        return toDTO(s, linhas, historico);
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoResponseDTO> listarParaAdmin(String status) {
        Conta conta = getContaLogada();
        ensureAdmin(conta);

        List<Solicitacao> solicitacoes;
        if (status == null || status.isBlank()) {
            solicitacoes = solicitacaoRepository.findAll();
        } else {
            StatusSolicitacao statusEnum;
            try {
                statusEnum = StatusSolicitacao.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Status invalido. Use PENDENTE, PENDENTE_INFO, APROVADO ou REPROVADO."
                );
            }

            solicitacoes = solicitacaoRepository.findByStatusOrderByEnviadoEmDesc(statusEnum);
        }

        return mapComLinhasEHistorico(solicitacoes);
    }

    @Transactional
    public SolicitacaoResponseDTO pedirInfo(Long id, SolicitacaoPedidoInfoDTO dto) {
        Conta conta = getContaLogada();
        ensureAdmin(conta);

        Solicitacao s = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitacao nao encontrada."));

        if (s.getStatus() != StatusSolicitacao.PENDENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solicitacao nao esta pendente.");
        }

        s.setStatus(StatusSolicitacao.PENDENTE_INFO);
        s.setComentarioDecisao(dto.comentario());
        s.setDecididoEm(null);
        s.setValorAprovado(null);

        Solicitacao salva = solicitacaoRepository.save(s);
        registrarHistorico(salva.getId(), conta.getTipo().name(), ACAO_PEDIDO_INFO, dto.comentario());

        List<SolicitacaoLinha> linhas = solicitacaoLinhaRepository.findBySolicitacaoId(salva.getId());
        List<SolicitacaoHistorico> historico = solicitacaoHistoricoRepository
                .findBySolicitacaoIdOrderByCriadoEmAsc(salva.getId());

        return toDTO(salva, linhas, historico);
    }

    @Transactional
    public SolicitacaoResponseDTO decidir(Long id, DecisaoSolicitacaoDTO dto) {
        Conta conta = getContaLogada();
        ensureAdmin(conta);

        Solicitacao s = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitacao nao encontrada."));

        if (s.getStatus() != StatusSolicitacao.PENDENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solicitacao nao esta pendente.");
        }

        String decisao = dto.decisao().trim().toUpperCase();

        if (!decisao.equals("APROVADO") && !decisao.equals("REPROVADO")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Decisao invalida. Use APROVADO ou REPROVADO."
            );
        }

        if (decisao.equals("APROVADO")) {
            s.setStatus(StatusSolicitacao.APROVADO);
            s.setValorAprovado(dto.valorAprovado() != null ? dto.valorAprovado() : s.getValorEstimado());
        } else {
            s.setStatus(StatusSolicitacao.REPROVADO);
            s.setValorAprovado(null);
        }

        s.setComentarioDecisao(dto.comentario());
        s.setDecididoEm(LocalDateTime.now());

        Solicitacao salva = solicitacaoRepository.save(s);

        String acao = decisao.equals("APROVADO") ? ACAO_APROVADA : ACAO_REPROVADA;
        registrarHistorico(salva.getId(), conta.getTipo().name(), acao, dto.comentario());

        List<SolicitacaoLinha> linhas = solicitacaoLinhaRepository.findBySolicitacaoId(salva.getId());
        List<SolicitacaoHistorico> historico = solicitacaoHistoricoRepository
                .findBySolicitacaoIdOrderByCriadoEmAsc(salva.getId());

        return toDTO(salva, linhas, historico);
    }

    @Transactional
    public void excluir(Long id) {
        Conta conta = getContaLogada();
        ensureAdmin(conta);
        Solicitacao s = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitacao nao encontrada."));
        solicitacaoHistoricoRepository.deleteBySolicitacaoId(s.getId());
        solicitacaoLinhaRepository.deleteBySolicitacaoId(s.getId());
        attachmentService.deleteAllForSolicitacao(s.getId());
        solicitacaoRepository.delete(s);
    }

    private Conta getContaLogada() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario nao autenticado.");
        }

        String usuario = auth.getName();
        return contaRepository.findByUsuario(usuario)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Conta autenticada nao encontrada no banco."
                ));
    }

    private void ensureFilial(Conta conta) {
        if (conta.getTipo() != TipoConta.FILIAL) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas FILIAL pode acessar este recurso.");
        }
        if (conta.getFilial() == null || conta.getFilial().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Conta FILIAL sem filial definida.");
        }
    }

    private void ensureAdmin(Conta conta) {
        if (conta.getTipo() != TipoConta.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas ADMIN pode acessar este recurso.");
        }
    }

    private List<SolicitacaoLinha> salvarLinhas(Long solicitacaoId, List<SolicitacaoLinhaCreateDTO> linhas) {
        if (linhas == null || linhas.isEmpty()) {
            return List.of();
        }

        List<SolicitacaoLinha> entidades = linhas.stream()
                .map(linha -> SolicitacaoLinha.builder()
                        .solicitacaoId(solicitacaoId)
                        .descricao(linha.descricao().trim())
                        .valor(linha.valor())
                        .observacao(linha.observacao())
                        .build())
                .toList();

        return solicitacaoLinhaRepository.saveAll(entidades);
    }

    private void registrarHistorico(Long solicitacaoId, String ator, String acao, String comentario) {
        SolicitacaoHistorico historico = SolicitacaoHistorico.builder()
                .solicitacaoId(solicitacaoId)
                .ator(ator)
                .acao(acao)
                .comentario(comentario)
                .build();

        solicitacaoHistoricoRepository.save(historico);
    }

    private List<SolicitacaoResponseDTO> mapComLinhasEHistorico(List<Solicitacao> solicitacoes) {
        if (solicitacoes.isEmpty()) {
            return List.of();
        }

        List<Long> ids = solicitacoes.stream().map(Solicitacao::getId).toList();
        Map<Long, List<SolicitacaoLinha>> linhasPorSolicitacao = solicitacaoLinhaRepository
                .findBySolicitacaoIdIn(ids)
                .stream()
                .collect(Collectors.groupingBy(SolicitacaoLinha::getSolicitacaoId));

        Map<Long, List<SolicitacaoHistorico>> historicoPorSolicitacao = solicitacaoHistoricoRepository
                .findBySolicitacaoIdInOrderByCriadoEmAsc(ids)
                .stream()
                .collect(Collectors.groupingBy(SolicitacaoHistorico::getSolicitacaoId));

        return solicitacoes.stream()
                .map(solicitacao -> toDTO(
                        solicitacao,
                        linhasPorSolicitacao.getOrDefault(solicitacao.getId(), List.of()),
                        historicoPorSolicitacao.getOrDefault(solicitacao.getId(), List.of())
                ))
                .toList();
    }

    private SolicitacaoResponseDTO toDTO(Solicitacao s,
                                         List<SolicitacaoLinha> linhas,
                                         List<SolicitacaoHistorico> historico) {
        return new SolicitacaoResponseDTO(
                s.getId(),
                s.getFilial(),
                s.getCategoria().getId(),
                s.getCategoria().getNome(),
                s.getTitulo(),
                s.getSolicitanteNome(),
                s.getDescricao(),
                s.getOndeVaiSerUsado(),
                s.getValorEstimado(),
                s.getValorAprovado(),
                s.getFornecedor(),
                s.getFormaPagamento(),
                s.getObservacoes(),
                s.getStatus(),
                s.getEnviadoEm(),
                s.getDecididoEm(),
                s.getComentarioDecisao(),
                linhas.stream().map(this::toLinhaDTO).toList(),
                historico.stream().map(this::toHistoricoDTO).toList()
        );
    }

    private SolicitacaoLinhaResponseDTO toLinhaDTO(SolicitacaoLinha linha) {
        return new SolicitacaoLinhaResponseDTO(
                linha.getId(),
                linha.getDescricao(),
                linha.getValor(),
                linha.getObservacao()
        );
    }

    private SolicitacaoHistoricoResponseDTO toHistoricoDTO(SolicitacaoHistorico historico) {
        return new SolicitacaoHistoricoResponseDTO(
                historico.getId(),
                historico.getAtor(),
                historico.getAcao(),
                historico.getComentario(),
                historico.getCriadoEm()
        );
    }
}




