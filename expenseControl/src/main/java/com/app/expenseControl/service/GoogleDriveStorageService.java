package com.app.expenseControl.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
@Lazy
public class GoogleDriveStorageService {

    private static final String LOCAL_FOLDER_PREFIX = "local-folder:";
    private static final String LOCAL_FILE_PREFIX = "local-file:";

    private final Path localRootPath;

    public GoogleDriveStorageService(
            @Value("${app.attachments.local-root:${ATTACHMENTS_LOCAL_ROOT:/solicitacoes}}") String localRoot
    ) {
        this.localRootPath = Paths.get(localRoot).toAbsolutePath().normalize();
    }

    public String ensureFolder(Long requestId) {
        if (requestId == null) {
            throw new IllegalArgumentException("ID da solicitacao obrigatorio para criar pasta.");
        }

        try {
            Path folder = localRootPath.resolve(String.valueOf(requestId)).normalize();
            ensureWithinRoot(folder);
            Files.createDirectories(folder);
            return LOCAL_FOLDER_PREFIX + requestId;
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao criar pasta de anexos.", ex);
        }
    }

    public String uploadFile(String folderId, String storedName, org.springframework.web.multipart.MultipartFile file) {
        Long requestId = parseRequestId(folderId);

        try {
            Path folder = localRootPath.resolve(String.valueOf(requestId)).normalize();
            ensureWithinRoot(folder);
            Files.createDirectories(folder);

            Path target = folder.resolve(storedName).normalize();
            ensureWithinRoot(target);

            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }

            return LOCAL_FILE_PREFIX + requestId + "/" + storedName;
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao salvar arquivo localmente.", ex);
        }
    }

    public InputStream downloadFile(String fileId) {
        Path file = resolveLocalFile(fileId);
        try {
            return Files.newInputStream(file);
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao ler arquivo local.", ex);
        }
    }

    public void deleteFile(String fileId) {
        Path file = resolveLocalFile(fileId);
        try {
            Files.deleteIfExists(file);
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao remover arquivo local.", ex);
        }
    }

    private Path resolveLocalFile(String fileId) {
        if (!isLocalFileId(fileId)) {
            throw new IllegalStateException("ID de arquivo invalido para armazenamento local.");
        }

        String relative = fileId.substring(LOCAL_FILE_PREFIX.length());
        if (relative.isBlank()) {
            throw new IllegalStateException("ID de arquivo local vazio.");
        }

        Path file = localRootPath.resolve(relative).normalize();
        ensureWithinRoot(file);
        return file;
    }

    private Long parseRequestId(String folderId) {
        if (folderId == null || !folderId.startsWith(LOCAL_FOLDER_PREFIX)) {
            throw new IllegalStateException("ID de pasta invalido para armazenamento local.");
        }
        String value = folderId.substring(LOCAL_FOLDER_PREFIX.length()).trim();
        if (value.isBlank()) {
            throw new IllegalStateException("ID de pasta local vazio.");
        }
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ex) {
            throw new IllegalStateException("ID de pasta local invalido.", ex);
        }
    }

    private void ensureWithinRoot(Path path) {
        if (!path.startsWith(localRootPath)) {
            throw new IllegalStateException("Caminho de anexo local invalido.");
        }
    }

    private boolean isLocalFileId(String value) {
        return value != null && value.startsWith(LOCAL_FILE_PREFIX);
    }
}
