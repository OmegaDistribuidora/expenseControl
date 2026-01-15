package com.app.expenseControl.dto;

public record CategoriaResponseDTO(
        Long id,
        String nome,
        String descricao,
        boolean ativa
) {
}
