package com.app.expenseControl.dto;

import com.app.expenseControl.enums.TipoConta;

import java.util.List;

public record AuthMeResponseDTO(
        String usuario,
        String nome,
        TipoConta tipo,
        String filial,
        boolean podeAprovarSolicitacao,
        boolean superAdmin,
        List<String> filiaisVisiveis
) {}

