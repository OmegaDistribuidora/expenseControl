package com.app.expenseControl.dto;

import com.app.expenseControl.enums.StatusSolicitacao;

public record SolicitacaoStatusResumoDTO(
        StatusSolicitacao status,
        long total
) {}
