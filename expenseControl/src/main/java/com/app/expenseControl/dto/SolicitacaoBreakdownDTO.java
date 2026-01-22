package com.app.expenseControl.dto;

import java.math.BigDecimal;

public record SolicitacaoBreakdownDTO(
        String label,
        long total,
        BigDecimal valorTotal
) {}
