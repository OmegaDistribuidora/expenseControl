package com.app.expenseControl.dto;

import com.app.expenseControl.enums.StatusSolicitacao;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SolicitacaoResponseDTO(
        Long id,
        String filial,
        Long categoriaId,
        String categoriaNome,
        String titulo,
        String solicitanteNome,
        String descricao,
        String ondeVaiSerUsado,
        BigDecimal valorEstimado,
        BigDecimal valorAprovado,
        String fornecedor,
        String formaPagamento,
        String observacoes,
        StatusSolicitacao status,
        LocalDateTime enviadoEm,
        LocalDateTime decididoEm,
        String comentarioDecisao,
        List<SolicitacaoLinhaResponseDTO> linhas,
        List<SolicitacaoHistoricoResponseDTO> historico
) {}
