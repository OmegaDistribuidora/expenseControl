package com.app.expenseControl.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoriaCreateDTO(
        @NotBlank @Size(max = 120)
        String nome,

        @Size(max = 255)
        String descricao
) {}
