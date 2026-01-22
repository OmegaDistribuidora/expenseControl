package com.app.expenseControl.dto;

import java.math.BigDecimal;
import java.util.List;

public record SolicitacaoStatsDTO(
        long totalAprovadas,
        BigDecimal valorTotalAprovado,
        List<SolicitacaoBreakdownDTO> porCategoria,
        List<SolicitacaoBreakdownDTO> porFilial,
        List<SolicitacaoStatusResumoDTO> porStatus
) {}
