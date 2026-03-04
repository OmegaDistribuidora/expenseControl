package com.app.expenseControl.dto;

import java.time.LocalDateTime;

public record AuditoriaEventoResponseDTO(
        Long id,
        String usuario,
        String tipoConta,
        String acao,
        String referenciaTipo,
        String referenciaId,
        String detalhe,
        String detalheCompleto,
        LocalDateTime criadoEm
) {}
