package com.app.expenseControl.service;

import com.app.expenseControl.dto.DecisaoSolicitacaoDTO;
import com.app.expenseControl.dto.PageResponse;
import com.app.expenseControl.dto.SolicitacaoCreateDTO;
import com.app.expenseControl.dto.SolicitacaoLinhaCreateDTO;
import com.app.expenseControl.dto.SolicitacaoPedidoInfoDTO;
import com.app.expenseControl.dto.SolicitacaoReenvioDTO;
import com.app.expenseControl.dto.SolicitacaoResponseDTO;
import com.app.expenseControl.dto.SolicitacaoStatsDTO;
import com.app.expenseControl.entity.Attachment;
import com.app.expenseControl.entity.Categoria;
import com.app.expenseControl.entity.Conta;
import com.app.expenseControl.entity.Solicitacao;
import com.app.expenseControl.entity.SolicitacaoHistorico;
import com.app.expenseControl.entity.SolicitacaoLinha;
import com.app.expenseControl.enums.StatusSolicitacao;
import com.app.expenseControl.enums.TipoConta;
import com.app.expenseControl.repository.CategoriaRepository;
import com.app.expenseControl.repository.ContaRepository;
import com.app.expenseControl.repository.AttachmentRepository;
import com.app.expenseControl.repository.SolicitacaoHistoricoRepository;
import com.app.expenseControl.repository.SolicitacaoLinhaRepository;
import com.app.expenseControl.repository.SolicitacaoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
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
    private static final DateTimeFormatter AUDIT_DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    private final SolicitacaoRepository solicitacaoRepository;
    private final CategoriaRepository categoriaRepository;
    private final ContaRepository contaRepository;
    private final AttachmentRepository attachmentRepository;
    private final SolicitacaoLinhaRepository solicitacaoLinhaRepository;
    private final SolicitacaoHistoricoRepository solicitacaoHistoricoRepository;
    private final AttachmentService attachmentService;
    private final ContaPermissionService permissionService;
    private final AuditoriaService auditoriaService;

    public SolicitacaoService(SolicitacaoRepository solicitacaoRepository,
                              CategoriaRepository categoriaRepository,
                              ContaRepository contaRepository,
                              AttachmentRepository attachmentRepository,
                              SolicitacaoLinhaRepository solicitacaoLinhaRepository,
                              SolicitacaoHistoricoRepository solicitacaoHistoricoRepository,
                              AttachmentService attachmentService,
                              ContaPermissionService permissionService,
                              AuditoriaService auditoriaService) {
        this.solicitacaoRepository = solicitacaoRepository;
        this.categoriaRepository = categoriaRepository;
        this.contaRepository = contaRepository;
        this.attachmentRepository = attachmentRepository;
        this.solicitacaoLinhaRepository = solicitacaoLinhaRepository;
        this.solicitacaoHistoricoRepository = solicitacaoHistoricoRepository;
        this.attachmentService = attachmentService;
        this.permissionService = permissionService;
        this.auditoriaService = auditoriaService;
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
        List<Attachment> anexos = attachmentRepository.findBySolicitacaoIdOrderByCreatedAtAsc(salva.getId());
        registrarHistorico(salva.getId(), conta.getTipo().name(), ACAO_CRIADA, null);
        registrarAuditoriaSolicitacao("SOLICITACAO_CRIADA", salva, linhasSalvas, anexos);

        List<SolicitacaoHistorico> historico = solicitacaoHistoricoRepository
                .findBySolicitacaoIdOrderByCriadoEmAsc(salva.getId());

        return SolicitacaoMapper.toDTO(salva, linhasSalvas, historico);
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
        List<Attachment> anexos = attachmentRepository.findBySolicitacaoIdOrderByCreatedAtAsc(salva.getId());

        registrarHistorico(salva.getId(), conta.getTipo().name(), ACAO_REENVIADA, dto.comentario());
        registrarAuditoriaSolicitacao("SOLICITACAO_REENVIADA", salva, linhasSalvas, anexos);

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
            solicitacoes = solicitacaoRepository.findByFilial(conta.getFilial(), pageable);
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitacao nao encontrada."));

        if (!conta.getFilial().equals(s.getFilial())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solicitacao nao pertence a filial.");
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
        List<Solicitacao> base = statusEnum == null
                ? solicitacaoRepository.findAll()
                : solicitacaoRepository.findByStatusOrderByEnviadoEmDesc(statusEnum);

        List<Solicitacao> solicitacoes = filterAdminVisibleSolicitacoes(conta, base);
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

        Page<Solicitacao> solicitacoes = buscarPaginaAdmin(conta, statusEnum, pageable, term, searchId, statusSearch);

        List<SolicitacaoResponseDTO> items = mapComLinhasEHistorico(solicitacoes.getContent());
        return toPageResponse(solicitacoes, items);
    }

    public SolicitacaoStatsDTO estatisticasAprovadas() {
        Conta conta = getContaLogada();
        ensureAdmin(conta);

        if (permissionService.isRootAdmin(conta)) {
            return estatisticasGlobais();
        }

        List<String> filiais = visibleFilialKeys(conta);
        if (filiais.isEmpty()) {
            var porStatus = java.util.Arrays.stream(StatusSolicitacao.values())
                    .map(status -> new com.app.expenseControl.dto.SolicitacaoStatusResumoDTO(status, 0L))
                    .toList();
            return new SolicitacaoStatsDTO(0L, BigDecimal.ZERO, List.of(), List.of(), porStatus);
        }

        long totalAprovadas = solicitacaoRepository.countByStatusAndFilialIn(StatusSolicitacao.APROVADO, filiais);
        var valorTotalAprovado = solicitacaoRepository.sumValorAprovadoByStatusAndFiliais(StatusSolicitacao.APROVADO, filiais);
        if (valorTotalAprovado == null) {
            valorTotalAprovado = BigDecimal.ZERO;
        }

        var porCategoria = solicitacaoRepository.resumoPorCategoriaAndFiliais(StatusSolicitacao.APROVADO, filiais);
        var porFilial = solicitacaoRepository.resumoPorFilialAndFiliais(StatusSolicitacao.APROVADO, filiais);
        var porStatus = java.util.Arrays.stream(StatusSolicitacao.values())
                .map(status -> new com.app.expenseControl.dto.SolicitacaoStatusResumoDTO(
                        status,
                        solicitacaoRepository.countByStatusAndFilialIn(status, filiais)
                ))
                .toList();

        return new SolicitacaoStatsDTO(totalAprovadas, valorTotalAprovado, porCategoria, porFilial, porStatus);
    }

    @Transactional
    public SolicitacaoResponseDTO pedirInfo(Long id, SolicitacaoPedidoInfoDTO dto) {
        Conta conta = getContaLogada();
        ensureAdmin(conta);
        ensureAdminCanDecide(conta);

        Solicitacao s = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitacao nao encontrada."));
        ensureAdminCanViewSolicitacao(conta, s);

        if (s.getStatus() != StatusSolicitacao.PENDENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solicitacao nao esta pendente.");
        }

        s.setStatus(StatusSolicitacao.PENDENTE_INFO);
        s.setComentarioDecisao(dto.comentario());
        s.setDecididoEm(null);
        s.setValorAprovado(null);

        Solicitacao salva = solicitacaoRepository.save(s);
        List<SolicitacaoLinha> linhas = solicitacaoLinhaRepository.findBySolicitacaoId(salva.getId());
        List<Attachment> anexos = attachmentRepository.findBySolicitacaoIdOrderByCreatedAtAsc(salva.getId());
        registrarHistorico(salva.getId(), conta.getTipo().name(), ACAO_PEDIDO_INFO, dto.comentario());
        registrarAuditoriaSolicitacao("SOLICITACAO_PEDIDO_AJUSTE", salva, linhas, anexos);
        List<SolicitacaoHistorico> historico = solicitacaoHistoricoRepository
                .findBySolicitacaoIdOrderByCriadoEmAsc(salva.getId());

        return SolicitacaoMapper.toDTO(salva, linhas, historico);
    }

    @Transactional
    public SolicitacaoResponseDTO decidir(Long id, DecisaoSolicitacaoDTO dto) {
        Conta conta = getContaLogada();
        ensureAdmin(conta);
        ensureAdminCanDecide(conta);

        Solicitacao s = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitacao nao encontrada."));
        ensureAdminCanViewSolicitacao(conta, s);

        if (s.getStatus() != StatusSolicitacao.PENDENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solicitacao nao esta pendente.");
        }

        String decisao = dto.decisao().trim().toUpperCase();
        if (!decisao.equals("APROVADO") && !decisao.equals("REPROVADO")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Decisao invalida. Use APROVADO ou REPROVADO.");
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
        List<SolicitacaoLinha> linhas = solicitacaoLinhaRepository.findBySolicitacaoId(salva.getId());
        List<Attachment> anexos = attachmentRepository.findBySolicitacaoIdOrderByCreatedAtAsc(salva.getId());

        String acao = decisao.equals("APROVADO") ? ACAO_APROVADA : ACAO_REPROVADA;
        registrarHistorico(salva.getId(), conta.getTipo().name(), acao, dto.comentario());
        registrarAuditoriaSolicitacao(
                decisao.equals("APROVADO") ? "SOLICITACAO_APROVADA" : "SOLICITACAO_REPROVADA",
                salva,
                linhas,
                anexos
        );
        List<SolicitacaoHistorico> historico = solicitacaoHistoricoRepository
                .findBySolicitacaoIdOrderByCriadoEmAsc(salva.getId());

        return SolicitacaoMapper.toDTO(salva, linhas, historico);
    }

    @Transactional
    public void excluir(Long id) {
        Conta conta = getContaLogada();
        ensureAdmin(conta);
        ensureAdminCanDecide(conta);

        Solicitacao s = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitacao nao encontrada."));
        ensureAdminCanViewSolicitacao(conta, s);
        List<SolicitacaoLinha> linhas = solicitacaoLinhaRepository.findBySolicitacaoId(s.getId());
        List<Attachment> anexos = attachmentRepository.findBySolicitacaoIdOrderByCreatedAtAsc(s.getId());

        solicitacaoHistoricoRepository.deleteBySolicitacaoId(s.getId());
        solicitacaoLinhaRepository.deleteBySolicitacaoId(s.getId());
        attachmentService.deleteAllForSolicitacao(s.getId());
        solicitacaoRepository.delete(s);
        registrarAuditoriaSolicitacao("SOLICITACAO_EXCLUIDA", s, linhas, anexos);
    }

    private Page<Solicitacao> buscarPaginaAdmin(Conta conta,
                                                StatusSolicitacao statusEnum,
                                                Pageable pageable,
                                                String term,
                                                Long searchId,
                                                StatusSolicitacao statusSearch) {
        if (permissionService.isRootAdmin(conta)) {
            if (term == null) {
                return statusEnum == null
                        ? solicitacaoRepository.findAll(pageable)
                        : solicitacaoRepository.findByStatus(statusEnum, pageable);
            }
            if (statusEnum == null) {
                return solicitacaoRepository.searchAll(term, searchId, statusSearch, pageable);
            }
            return solicitacaoRepository.searchByStatus(statusEnum, term, searchId, statusSearch, pageable);
        }

        List<String> filiais = visibleFilialKeys(conta);
        if (filiais.isEmpty()) {
            return Page.empty(pageable);
        }

        String safeTerm = term == null ? "%%" : term;
        if (statusEnum == null) {
            return solicitacaoRepository.searchAllByFiliais(filiais, safeTerm, searchId, statusSearch, pageable);
        }
        return solicitacaoRepository.searchByStatusAndFiliais(
                statusEnum,
                filiais,
                safeTerm,
                searchId,
                statusSearch,
                pageable
        );
    }

    private SolicitacaoStatsDTO estatisticasGlobais() {
        long totalAprovadas = solicitacaoRepository.countByStatus(StatusSolicitacao.APROVADO);
        var valorTotalAprovado = solicitacaoRepository.sumValorAprovadoByStatus(StatusSolicitacao.APROVADO);
        if (valorTotalAprovado == null) {
            valorTotalAprovado = BigDecimal.ZERO;
        }

        var porCategoria = solicitacaoRepository.resumoPorCategoria(StatusSolicitacao.APROVADO);
        var porFilial = solicitacaoRepository.resumoPorFilial(StatusSolicitacao.APROVADO);
        var porStatus = java.util.Arrays.stream(StatusSolicitacao.values())
                .map(status -> new com.app.expenseControl.dto.SolicitacaoStatusResumoDTO(
                        status,
                        solicitacaoRepository.countByStatus(status)
                ))
                .toList();

        return new SolicitacaoStatsDTO(totalAprovadas, valorTotalAprovado, porCategoria, porFilial, porStatus);
    }

    private PageResponse<SolicitacaoResponseDTO> toPageResponse(Page<Solicitacao> page,
                                                                List<SolicitacaoResponseDTO> items) {
        return new PageResponse<>(items, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
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
                    "Status invalido. Use PENDENTE, PENDENTE_INFO, APROVADO ou REPROVADO."
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

    private void ensureAdminCanViewSolicitacao(Conta conta, Solicitacao solicitacao) {
        if (permissionService.isRootAdmin(conta)) {
            return;
        }
        if (solicitacao == null || !permissionService.canViewFilial(conta, solicitacao.getFilial())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sem permissao para visualizar esta solicitacao.");
        }
    }

    private void ensureAdminCanDecide(Conta conta) {
        if (!permissionService.canApproveSolicitacao(conta)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Usuario sem permissao para aprovar ou solicitar revisao."
            );
        }
    }

    private List<String> visibleFilialKeys(Conta conta) {
        return permissionService.visibleFilialKeys(conta).stream().toList();
    }

    private List<Solicitacao> filterAdminVisibleSolicitacoes(Conta conta, List<Solicitacao> solicitacoes) {
        if (permissionService.isRootAdmin(conta)) {
            return solicitacoes;
        }
        List<String> filiais = visibleFilialKeys(conta);
        if (filiais.isEmpty()) {
            return List.of();
        }
        return solicitacoes.stream()
                .filter(item -> filiais.contains(permissionService.normalizedKey(item.getFilial())))
                .toList();
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

    private void registrarAuditoriaSolicitacao(String acao,
                                               Solicitacao solicitacao,
                                               List<SolicitacaoLinha> linhas,
                                               List<Attachment> anexos) {
        String resumo = buildSolicitacaoResumo(solicitacao);
        String detalheCompleto = buildSolicitacaoDetalheCompleto(acao, solicitacao, linhas, anexos);
        auditoriaService.registrar(
                acao,
                resumo,
                detalheCompleto,
                "SOLICITACAO",
                String.valueOf(solicitacao.getId())
        );
    }

    private String buildSolicitacaoResumo(Solicitacao s) {
        return "Solicitacao #" + s.getId()
                + " | Valor estimado: " + formatCurrency(s.getValorEstimado())
                + " | Categoria: " + safe(s.getCategoria() == null ? null : s.getCategoria().getNome())
                + " | Filial: " + safe(s.getFilial())
                + " | Titulo: " + safe(s.getTitulo());
    }

    private String buildSolicitacaoDetalheCompleto(String acao,
                                                   Solicitacao s,
                                                   List<SolicitacaoLinha> linhas,
                                                   List<Attachment> anexos) {
        StringBuilder sb = new StringBuilder();
        sb.append("Acao: ").append(acao).append('\n');
        sb.append("ID da solicitacao: ").append(s.getId()).append('\n');
        sb.append("Empresa/Filial: ").append(safe(s.getFilial())).append('\n');
        sb.append("Categoria: ").append(safe(s.getCategoria() == null ? null : s.getCategoria().getNome())).append('\n');
        sb.append("Titulo: ").append(safe(s.getTitulo())).append('\n');
        sb.append("Descricao: ").append(safe(s.getDescricao())).append('\n');
        sb.append("Onde vai ser usado: ").append(safe(s.getOndeVaiSerUsado())).append('\n');
        sb.append("Valor estimado: ").append(formatCurrency(s.getValorEstimado())).append('\n');
        sb.append("Valor aprovado: ").append(formatCurrency(s.getValorAprovado())).append('\n');
        sb.append("Solicitante: ").append(safe(s.getSolicitanteNome())).append('\n');
        sb.append("Fornecedor/Empresa: ").append(safe(s.getFornecedor())).append('\n');
        sb.append("Forma de pagamento: ").append(safe(s.getFormaPagamento())).append('\n');
        sb.append("Observacoes: ").append(safe(s.getObservacoes())).append('\n');
        sb.append("Status: ").append(s.getStatus() == null ? "-" : s.getStatus().name()).append('\n');
        sb.append("Enviado em: ").append(formatDateTime(s.getEnviadoEm())).append('\n');
        sb.append("Decidido em: ").append(formatDateTime(s.getDecididoEm())).append('\n');
        sb.append("Comentario decisao: ").append(safe(s.getComentarioDecisao())).append('\n');

        sb.append("Itens:\n");
        if (linhas == null || linhas.isEmpty()) {
            sb.append("  - Nenhum item.\n");
        } else {
            for (SolicitacaoLinha linha : linhas) {
                sb.append("  - Descricao: ").append(safe(linha.getDescricao()))
                        .append(" | Valor: ").append(formatCurrency(linha.getValor()))
                        .append(" | Observacao: ").append(safe(linha.getObservacao()))
                        .append('\n');
            }
        }

        sb.append("Anexos:\n");
        if (anexos == null || anexos.isEmpty()) {
            sb.append("  - Nenhum anexo.\n");
        } else {
            for (Attachment anexo : anexos) {
                sb.append("  - Arquivo: ").append(safe(anexo.getOriginalName()))
                        .append(" | Tamanho: ").append(formatBytes(anexo.getSize()))
                        .append(" | Tipo: ").append(safe(anexo.getContentType()))
                        .append(" | Enviado por: ").append(safe(anexo.getUploadedBy()))
                        .append(" | Data: ").append(formatDateTime(anexo.getCreatedAt()))
                        .append('\n');
            }
        }

        return sb.toString().trim();
    }

    private String safe(String value) {
        if (value == null || value.isBlank()) return "-";
        return value.trim();
    }

    private String formatCurrency(BigDecimal value) {
        if (value == null) return "-";
        return NumberFormat.getCurrencyInstance(new Locale("pt", "BR")).format(value);
    }

    private String formatDateTime(LocalDateTime value) {
        if (value == null) return "-";
        return value.format(AUDIT_DATE_FORMAT);
    }

    private String formatBytes(Long size) {
        if (size == null) return "-";
        double bytes = size.doubleValue();
        if (bytes < 1024) return String.format(Locale.ROOT, "%.0f B", bytes);
        double kb = bytes / 1024.0;
        if (kb < 1024) return String.format(Locale.ROOT, "%.1f KB", kb);
        double mb = kb / 1024.0;
        return String.format(Locale.ROOT, "%.1f MB", mb);
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
