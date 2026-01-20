package com.app.expenseControl.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record SolicitacaoCreateDTO(
        @NotNull
        Long categoriaId,

        @NotBlank @Size(max = 120)
        String titulo,

        @NotBlank @Size(max = 120)
        String solicitanteNome,

        @NotBlank @Size(max = 2000)
        String descricao,

        @NotBlank @Size(max = 255)
        String ondeVaiSerUsado,

        @NotNull @DecimalMin(value = "0.01")
        BigDecimal valorEstimado,

        @Size(max = 120)
        String fornecedor,

        @Size(max = 50)
        String formaPagamento,

        @Size(max = 1000)
        String observacoes,

        @Valid
        List<SolicitacaoLinhaCreateDTO> linhas
) {}
