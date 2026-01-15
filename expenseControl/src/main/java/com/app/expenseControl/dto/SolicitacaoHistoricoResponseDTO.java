package com.app.expenseControl.dto;

import java.time.LocalDateTime;

public record SolicitacaoHistoricoResponseDTO(
        Long id,
        String ator,
        String acao,
        String comentario,
        LocalDateTime criadoEm
) {}
