package com.app.expenseControl.controller;

import com.app.expenseControl.dto.SolicitacaoCreateDTO;
import com.app.expenseControl.dto.SolicitacaoReenvioDTO;
import com.app.expenseControl.dto.SolicitacaoResponseDTO;
import com.app.expenseControl.dto.PageResponse;
import com.app.expenseControl.service.SolicitacaoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/solicitacoes")
public class SolicitacaoController {

    private final SolicitacaoService solicitacaoService;

    public SolicitacaoController(SolicitacaoService solicitacaoService){
        this.solicitacaoService = solicitacaoService;
    }

    @PostMapping
    public ResponseEntity<SolicitacaoResponseDTO> criar(@RequestBody @Valid SolicitacaoCreateDTO dto){
        return ResponseEntity.status(201).body(solicitacaoService.criar(dto));
    }

    @PutMapping("/{id}/reenvio")
    public ResponseEntity<SolicitacaoResponseDTO> reenvio(@PathVariable Long id,
                                                          @RequestBody @Valid SolicitacaoReenvioDTO dto) {
        return ResponseEntity.ok(solicitacaoService.reenvio(id, dto));
    }

    @GetMapping
    public PageResponse<SolicitacaoResponseDTO> listar(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", required = false) String sort,
            @RequestParam(value = "q", required = false) String query
    ) {
        return solicitacaoService.listarDaFilial(page, size, sort, query);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SolicitacaoResponseDTO> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(solicitacaoService.buscarDaFilial(id));
    }
}
