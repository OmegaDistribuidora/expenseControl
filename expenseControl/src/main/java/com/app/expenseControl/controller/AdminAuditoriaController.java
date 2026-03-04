package com.app.expenseControl.controller;

import com.app.expenseControl.dto.AuditoriaEventoResponseDTO;
import com.app.expenseControl.dto.PageResponse;
import com.app.expenseControl.service.AuditoriaService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/auditoria")
public class AdminAuditoriaController {

    private final AuditoriaService auditoriaService;

    public AdminAuditoriaController(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    @GetMapping
    public PageResponse<AuditoriaEventoResponseDTO> listar(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "q", required = false) String query
    ) {
        return auditoriaService.listar(page, size, query);
    }
}

