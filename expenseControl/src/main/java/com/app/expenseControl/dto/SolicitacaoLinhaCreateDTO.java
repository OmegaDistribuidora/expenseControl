package com.app.expenseControl.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record SolicitacaoLinhaCreateDTO(
        @NotBlank @Size(max = 160)
        String descricao,

        @NotNull @DecimalMin(value = "0.01")
        BigDecimal valor,

        @Size(max = 300)
        String observacao
) {}
