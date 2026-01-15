package com.app.expenseControl.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitacaoReenvioDTO(
        @NotNull @Valid
        SolicitacaoCreateDTO dados,

        @Size(max = 500)
        String comentario
) {}
