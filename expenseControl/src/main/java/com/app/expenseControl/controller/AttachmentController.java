package com.app.expenseControl.controller;

import com.app.expenseControl.dto.AttachmentResponseDTO;
import com.app.expenseControl.service.AttachmentDownload;
import com.app.expenseControl.service.AttachmentService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @PostMapping(path = {"/solicitacoes/{solicitacaoId}/anexos", "/requests/{solicitacaoId}/attachments"},
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AttachmentResponseDTO> upload(@PathVariable Long solicitacaoId,
                                                        @RequestParam("file") MultipartFile file) {
        AttachmentResponseDTO dto = attachmentService.upload(solicitacaoId, file);
        return ResponseEntity.status(201).body(dto);
    }

    @GetMapping({"/solicitacoes/{solicitacaoId}/anexos", "/requests/{solicitacaoId}/attachments"})
    public List<AttachmentResponseDTO> listar(@PathVariable Long solicitacaoId) {
        return attachmentService.listBySolicitacao(solicitacaoId);
    }

    @GetMapping({"/anexos/{attachmentId}/download", "/attachments/{attachmentId}/download"})
    public ResponseEntity<InputStreamResource> download(@PathVariable Long attachmentId) {
        AttachmentDownload download = attachmentService.download(attachmentId);
        String filename = sanitizeFilename(download.attachment().getOriginalName());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(download.attachment().getContentType()))
                .contentLength(download.attachment().getSize())
                .body(new InputStreamResource(download.inputStream()));
    }

    @DeleteMapping({"/anexos/{attachmentId}", "/attachments/{attachmentId}"})
    public ResponseEntity<Void> delete(@PathVariable Long attachmentId) {
        attachmentService.delete(attachmentId);
        return ResponseEntity.noContent().build();
    }

    private String sanitizeFilename(String value) {
        if (value == null || value.isBlank()) return "arquivo";
        return value.replace("\"", "'");
    }
}
