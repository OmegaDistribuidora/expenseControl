package com.app.expenseControl.service;

import com.app.expenseControl.dto.DecisaoSolicitacaoDTO;
import com.app.expenseControl.dto.PageResponse;
import com.app.expenseControl.dto.SolicitacaoCreateDTO;
import com.app.expenseControl.dto.SolicitacaoLinhaCreateDTO;
import com.app.expenseControl.dto.SolicitacaoPedidoInfoDTO;
import com.app.expenseControl.dto.SolicitacaoReenvioDTO;
import com.app.expenseControl.dto.SolicitacaoResponseDTO;
import com.app.expenseControl.dto.SolicitacaoStatsDTO;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Categoria não encontrada."));
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

        return SolicitacaoMapper.toDTO(salva, linhasSalvas, historico);
    }

    @Transactional
    public SolicitacaoResponseDTO reenvio(Long id, SolicitacaoReenvioDTO dto) {
        Conta conta = getContaLogada();
        ensureFilial(conta);

        Solicitacao s = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitação não encontrada."));

        if (!conta.getFilial().equals(s.getFilial())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solicitação não pertence à filial.");
        }

        if (s.getStatus() != StatusSolicitacao.PENDENTE_INFO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solicitação não está aguardando informações.");
        }

        Categoria categoria = categoriaRepository.findById(dto.dados().categoriaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Categoria não encontrada."));
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

        return SolicitacaoMapper.toDTO(salva, linhasSalvas, historico);
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
    public PageResponse<SolicitacaoResponseDTO> listarDaFilial(int page, int size, String sort, String query) {
        Conta conta = getContaLogada();
        ensureFilial(conta);

        Pageable pageable = buildPageable(page, size, resolveSort(sort));
        String term = normalizeSearchTerm(query);
        Long searchId = parseSearchId(query);
        StatusSolicitacao statusSearch = parseSearchStatus(query);
        Page<Solicitacao> solicitacoes;
        if (term == null) {
            solicitacoes = solicitacaoRepository
                    .findByFilial(conta.getFilial(), pageable);
        } else {
            solicitacoes = solicitacaoRepository.searchByFilial(
                    conta.getFilial(),
                    term,
                    searchId,
                    statusSearch,
                    pageable
            );
        }

        List<SolicitacaoResponseDTO> items = mapComLinhasEHistorico(solicitacoes.getContent());
        return toPageResponse(solicitacoes, items);
    }

    @Transactional(readOnly = true)
    public SolicitacaoResponseDTO buscarDaFilial(Long id) {
        Conta conta = getContaLogada();
        ensureFilial(conta);

        Solicitacao s = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitação não encontrada."));

        if (!conta.getFilial().equals(s.getFilial())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solicitação não pertence à filial.");
        }

        List<SolicitacaoLinha> linhas = solicitacaoLinhaRepository.findBySolicitacaoId(s.getId());
        List<SolicitacaoHistorico> historico = solicitacaoHistoricoRepository
                .findBySolicitacaoIdOrderByCriadoEmAsc(s.getId());

        return SolicitacaoMapper.toDTO(s, linhas, historico);
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoResponseDTO> listarParaAdmin(String status) {
        Conta conta = getContaLogada();
        ensureAdmin(conta);

        StatusSolicitacao statusEnum = parseStatus(status);
        List<Solicitacao> solicitacoes = statusEnum == null
                ? solicitacaoRepository.findAll()
                : solicitacaoRepository.findByStatusOrderByEnviadoEmDesc(statusEnum);

        return mapComLinhasEHistorico(solicitacoes);
    }

    @Transactional(readOnly = true)
    public PageResponse<SolicitacaoResponseDTO> listarParaAdmin(String status, int page, int size, String sort, String query) {
        Conta conta = getContaLogada();
        ensureAdmin(conta);

        Pageable pageable = buildPageable(page, size, resolveSort(sort));
        StatusSolicitacao statusEnum = parseStatus(status);
        String term = normalizeSearchTerm(query);
        Long searchId = parseSearchId(query);
        StatusSolicitacao statusSearch = parseSearchStatus(query);
        Page<Solicitacao> solicitacoes;
        if (term == null) {
            solicitacoes = statusEnum == null
                    ? solicitacaoRepository.findAll(pageable)
                    : solicitacaoRepository.findByStatus(statusEnum, pageable);
        } else if (statusEnum == null) {
            solicitacoes = solicitacaoRepository.searchAll(
                    term,
                    searchId,
                    statusSearch,
                    pageable
            );
        } else {
            solicitacoes = solicitacaoRepository.searchByStatus(
                    statusEnum,
                    term,
                    searchId,
                    statusSearch,
                    pageable
            );
        }

        List<SolicitacaoResponseDTO> items = mapComLinhasEHistorico(solicitacoes.getContent());
        return toPageResponse(solicitacoes, items);
    }

    public SolicitacaoStatsDTO estatisticasAprovadas() {
        Conta conta = getContaLogada();
        ensureAdmin(conta);

        long totalAprovadas = solicitacaoRepository.countByStatus(StatusSolicitacao.APROVADO);
        var valorTotalAprovado = solicitacaoRepository.sumValorAprovadoByStatus(StatusSolicitacao.APROVADO);
        if (valorTotalAprovado == null) {
            valorTotalAprovado = java.math.BigDecimal.ZERO;
        }

        var porCategoria = solicitacaoRepository.resumoPorCategoria(StatusSolicitacao.APROVADO);
        var porFilial = solicitacaoRepository.resumoPorFilial(StatusSolicitacao.APROVADO);
        var porStatus = solicitacaoRepository.resumoPorStatus();

        return new SolicitacaoStatsDTO(totalAprovadas, valorTotalAprovado, porCategoria, porFilial, porStatus);
    }

    @Transactional
    public SolicitacaoResponseDTO pedirInfo(Long id, SolicitacaoPedidoInfoDTO dto) {
        Conta conta = getContaLogada();
        ensureAdmin(conta);

        Solicitacao s = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitação não encontrada."));

        if (s.getStatus() != StatusSolicitacao.PENDENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solicitação não está pendente.");
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

        return SolicitacaoMapper.toDTO(salva, linhas, historico);
    }

    @Transactional
    public SolicitacaoResponseDTO decidir(Long id, DecisaoSolicitacaoDTO dto) {
        Conta conta = getContaLogada();
        ensureAdmin(conta);

        Solicitacao s = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitação não encontrada."));

        if (s.getStatus() != StatusSolicitacao.PENDENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solicitação não está pendente.");
        }

        String decisao = dto.decisao().trim().toUpperCase();

        if (!decisao.equals("APROVADO") && !decisao.equals("REPROVADO")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Decisão inválida. Use APROVADO ou REPROVADO."
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

        return SolicitacaoMapper.toDTO(salva, linhas, historico);
    }

    @Transactional
    public void excluir(Long id) {
        Conta conta = getContaLogada();
        ensureAdmin(conta);
        Solicitacao s = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitação não encontrada."));
        solicitacaoHistoricoRepository.deleteBySolicitacaoId(s.getId());
        solicitacaoLinhaRepository.deleteBySolicitacaoId(s.getId());
        attachmentService.deleteAllForSolicitacao(s.getId());
        solicitacaoRepository.delete(s);
    }

    private PageResponse<SolicitacaoResponseDTO> toPageResponse(Page<Solicitacao> page,
                                                                List<SolicitacaoResponseDTO> items) {
        return new PageResponse<>(
                items,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    private StatusSolicitacao parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return StatusSolicitacao.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Status inválido. Use PENDENTE, PENDENTE_INFO, APROVADO ou REPROVADO."
            );
        }
    }

    private StatusSolicitacao parseSearchStatus(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        try {
            return StatusSolicitacao.valueOf(query.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String normalizeSearchTerm(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        return "%" + query.trim().toLowerCase() + "%";
    }

    private Long parseSearchId(String query) {
        if (query == null) {
            return null;
        }
        String trimmed = query.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        for (int i = 0; i < trimmed.length(); i++) {
            if (!Character.isDigit(trimmed.charAt(i))) {
                return null;
            }
        }
        try {
            return Long.valueOf(trimmed);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Sort resolveSort(String sortKey) {
        String key = sortKey == null ? "RECENT" : sortKey.trim().toUpperCase();
        return switch (key) {
            case "OLD" -> Sort.by(
                    Sort.Order.asc("enviadoEm").nullsLast(),
                    Sort.Order.asc("id")
            );
            case "VALUE_DESC" -> Sort.by(
                    Sort.Order.desc("valorEstimado").nullsLast(),
                    Sort.Order.desc("id")
            );
            case "VALUE_ASC" -> Sort.by(
                    Sort.Order.asc("valorEstimado").nullsLast(),
                    Sort.Order.asc("id")
            );
            case "TITLE" -> Sort.by(
                    Sort.Order.asc("titulo").ignoreCase().nullsLast(),
                    Sort.Order.asc("id")
            );
            default -> Sort.by(
                    Sort.Order.desc("enviadoEm").nullsLast(),
                    Sort.Order.desc("id")
            );
        };
    }

    private Pageable buildPageable(int page, int size, Sort sort) {
        int safePage = Math.max(0, page);
        int safeSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
        return PageRequest.of(safePage, safeSize, sort);
    }

    private Conta getContaLogada() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado.");
        }

        String usuario = auth.getName();
        return contaRepository.findByUsuario(usuario)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Conta autenticada não encontrada no banco."
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
                .map(solicitacao -> SolicitacaoMapper.toDTO(
                        solicitacao,
                        linhasPorSolicitacao.getOrDefault(solicitacao.getId(), List.of()),
                        historicoPorSolicitacao.getOrDefault(solicitacao.getId(), List.of())
                ))
                .toList();
    }
}




