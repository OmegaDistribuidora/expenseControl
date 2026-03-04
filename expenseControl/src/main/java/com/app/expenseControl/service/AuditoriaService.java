package com.app.expenseControl.service;

import com.app.expenseControl.dto.AuditoriaEventoResponseDTO;
import com.app.expenseControl.dto.PageResponse;
import com.app.expenseControl.entity.AuditoriaEvento;
import com.app.expenseControl.entity.Conta;
import com.app.expenseControl.repository.AuditoriaEventoRepository;
import com.app.expenseControl.repository.ContaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditoriaService {

    private static final Logger log = LoggerFactory.getLogger(AuditoriaService.class);
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final AuditoriaEventoRepository auditoriaEventoRepository;
    private final ContaRepository contaRepository;

    public AuditoriaService(AuditoriaEventoRepository auditoriaEventoRepository,
                            ContaRepository contaRepository) {
        this.auditoriaEventoRepository = auditoriaEventoRepository;
        this.contaRepository = contaRepository;
    }

    @Transactional
    public void registrar(String acao, String detalhe) {
        registrar(acao, detalhe, detalhe, null, null);
    }

    @Transactional
    public void registrar(String acao, String detalhe, String referenciaTipo, String referenciaId) {
        registrar(acao, detalhe, detalhe, referenciaTipo, referenciaId);
    }

    @Transactional
    public void registrar(String acao,
                          String resumo,
                          String detalheCompleto,
                          String referenciaTipo,
                          String referenciaId) {
        try {
            String actor = usuarioAutenticado();
            String tipoConta = tipoContaAutenticada(actor);
            AuditoriaEvento evento = AuditoriaEvento.builder()
                    .usuario(limit(actor, 120))
                    .tipoConta(limit(tipoConta, 30))
                    .acao(limit(normalizeAction(acao), 80))
                    .referenciaTipo(limit(blankToNull(referenciaTipo), 60))
                    .referenciaId(limit(blankToNull(referenciaId), 120))
                    .detalhe(limit(normalizeDetail(resumo), 2000))
                    .detalheCompleto(limit(normalizeFullDetail(detalheCompleto), 20000))
                    .build();
            auditoriaEventoRepository.save(evento);
        } catch (Exception ex) {
            // Auditoria nao deve bloquear a operacao principal.
            log.warn("Falha ao registrar auditoria para acao {}: {}", acao, ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditoriaEventoResponseDTO> listar(int page, int size, String query) {
        Pageable pageable = buildPageable(page, size);
        String term = normalizeSearchTerm(query);
        Page<AuditoriaEvento> rows = term == null
                ? auditoriaEventoRepository.findAll(pageable)
                : auditoriaEventoRepository.search(term, pageable);

        var items = rows.getContent().stream()
                .map(this::toDTO)
                .toList();
        return new PageResponse<>(items, rows.getNumber(), rows.getSize(), rows.getTotalElements(), rows.getTotalPages());
    }

    private AuditoriaEventoResponseDTO toDTO(AuditoriaEvento row) {
        return new AuditoriaEventoResponseDTO(
                row.getId(),
                row.getUsuario(),
                row.getTipoConta(),
                row.getAcao(),
                row.getReferenciaTipo(),
                row.getReferenciaId(),
                row.getDetalhe(),
                row.getDetalheCompleto(),
                row.getCriadoEm()
        );
    }

    private String usuarioAutenticado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            return "sistema";
        }
        return auth.getName().trim();
    }

    private String tipoContaAutenticada(String usuario) {
        if (usuario == null || usuario.isBlank() || "sistema".equalsIgnoreCase(usuario)) {
            return "SISTEMA";
        }
        return contaRepository.findByUsuario(usuario)
                .map(Conta::getTipo)
                .map(Enum::name)
                .orElse("DESCONHECIDO");
    }

    private String normalizeAction(String value) {
        if (value == null || value.isBlank()) {
            return "ACAO";
        }
        return value.trim().toUpperCase();
    }

    private String normalizeDetail(String value) {
        if (value == null || value.isBlank()) {
            return "Sem detalhes.";
        }
        return value.trim();
    }

    private String normalizeFullDetail(String value) {
        if (value == null || value.isBlank()) {
            return "Sem detalhes completos.";
        }
        return value.trim();
    }

    private String normalizeSearchTerm(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        return "%" + query.trim().toLowerCase() + "%";
    }

    private Pageable buildPageable(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
        Sort sort = Sort.by(
                Sort.Order.desc("criadoEm").nullsLast(),
                Sort.Order.desc("id")
        );
        return PageRequest.of(safePage, safeSize, sort);
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String limit(String value, int max) {
        if (value == null) return null;
        if (value.length() <= max) return value;
        return value.substring(0, max);
    }
}
