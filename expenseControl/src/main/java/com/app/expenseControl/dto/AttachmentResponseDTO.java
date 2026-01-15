package com.app.expenseControl.dto;

import java.time.LocalDateTime;

public record AttachmentResponseDTO(
        Long id,
        Long solicitacaoId,
        String driveFolderId,
        String originalName,
        String storedName,
        String contentType,
        Long size,
        String uploadedBy,
        LocalDateTime createdAt
) {}
