package com.app.expenseControl.controller;

import com.app.expenseControl.dto.CategoriaCreateDTO;
import com.app.expenseControl.dto.CategoriaResponseDTO;
import com.app.expenseControl.service.CategoriaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/categorias")
public class CategoriaAdminController {

    private final CategoriaService categoriaService;

    public CategoriaAdminController(CategoriaService categoriaService) {
        this.categoriaService = categoriaService;
    }

    @PostMapping
    public ResponseEntity<CategoriaResponseDTO> criar(@RequestBody @Valid CategoriaCreateDTO dto) {
        return ResponseEntity.status(201).body(categoriaService.criar(dto));
    }

    @GetMapping
    public List<CategoriaResponseDTO> listar() {
        return categoriaService.listar();
    }
}

