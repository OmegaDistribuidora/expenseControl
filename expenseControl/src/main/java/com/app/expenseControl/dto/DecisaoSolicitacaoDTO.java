package com.app.expenseControl.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record DecisaoSolicitacaoDTO(
        @NotBlank
        @Pattern(regexp = "(?i)APROVADO|REPROVADO")
        String decisao,

        @DecimalMin(value = "0.01")
        BigDecimal valorAprovado,

        @Size(max = 500)
        String comentario
) {}
