package com.app.expenseControl.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitacaoPedidoInfoDTO(
        @NotBlank @Size(max = 500)
        String comentario
) {}
