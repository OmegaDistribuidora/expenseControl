package com.app.expenseControl.dto;

import com.app.expenseControl.enums.TipoConta;

public record AuthMeResponseDTO(
        String usuario,
        String nome,
        TipoConta tipo,
        String filial
) {}

