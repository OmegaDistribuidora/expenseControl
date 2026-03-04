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
import java.util.Locale;

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
    public ResponseEntity<InputStreamResource> download(@PathVariable Long attachmentId,
                                                        @RequestParam(value = "disposition", defaultValue = "attachment")
                                                        String disposition) {
        AttachmentDownload download = attachmentService.download(attachmentId);
        String filename = sanitizeFilename(download.attachment().getOriginalName());
        String contentDisposition = resolveContentDisposition(disposition, download.attachment().getContentType());
        MediaType mediaType = resolveMediaType(download.attachment().getContentType());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition + "; filename=\"" + filename + "\"")
                .contentType(mediaType)
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

    private String resolveContentDisposition(String requested, String contentType) {
        String normalized = requested == null ? "" : requested.trim().toLowerCase(Locale.ROOT);
        if ("inline".equals(normalized) && isPreviewableContentType(contentType)) {
            return "inline";
        }
        return "attachment";
    }

    private MediaType resolveMediaType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        try {
            return MediaType.parseMediaType(contentType);
        } catch (IllegalArgumentException ex) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    private boolean isPreviewableContentType(String contentType) {
        if (contentType == null) return false;
        String lower = contentType.toLowerCase(Locale.ROOT);
        return lower.startsWith("image/") || "application/pdf".equals(lower);
    }
}
