package com.app.expenseControl.controller;

import com.app.expenseControl.dto.DecisaoSolicitacaoDTO;
import com.app.expenseControl.dto.SolicitacaoPedidoInfoDTO;
import com.app.expenseControl.dto.SolicitacaoResponseDTO;
import com.app.expenseControl.dto.PageResponse;
import com.app.expenseControl.dto.SolicitacaoStatsDTO;
import com.app.expenseControl.service.SolicitacaoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/solicitacoes")
public class AdminSolicitacaoController {

    private final SolicitacaoService solicitacaoService;

    public AdminSolicitacaoController(SolicitacaoService solicitacaoService) {
        this.solicitacaoService = solicitacaoService;
    }

    @GetMapping
    public PageResponse<SolicitacaoResponseDTO> listar(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "q", required = false) String query
    ) {
        return solicitacaoService.listarParaAdmin(status, page, size, query);
    }

    @GetMapping("/estatisticas")
    public SolicitacaoStatsDTO estatisticas() {
        return solicitacaoService.estatisticasAprovadas();
    }

    @PatchMapping("/{id}/pedido-info")
    public ResponseEntity<SolicitacaoResponseDTO> pedirInfo(@PathVariable Long id,
                                                            @RequestBody @Valid SolicitacaoPedidoInfoDTO dto) {
        return ResponseEntity.ok(solicitacaoService.pedirInfo(id, dto));
    }

    @PatchMapping("/{id}/decisao")
    public ResponseEntity<SolicitacaoResponseDTO> decidir(@PathVariable Long id,
                                                          @RequestBody @Valid DecisaoSolicitacaoDTO dto) {
        return ResponseEntity.ok(solicitacaoService.decidir(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        solicitacaoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
