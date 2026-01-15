package com.app.expenseControl.dto;

import java.math.BigDecimal;

public record SolicitacaoLinhaResponseDTO(
        Long id,
        String descricao,
        BigDecimal valor,
        String observacao
) {}
