package com.app.expenseControl.service;

import com.google.api.client.http.InputStreamContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Collections;
import java.util.List;

@Service
@Lazy
public class GoogleDriveStorageService {

    private static final String FOLDER_MIME = "application/vnd.google-apps.folder";
    private static final String LOCAL_FOLDER_PREFIX = "local-folder:";
    private static final String LOCAL_FILE_PREFIX = "local-file:";
    private static final Logger log = LoggerFactory.getLogger(GoogleDriveStorageService.class);

    private final ObjectProvider<Drive> driveProvider;
    private final String rootFolderName;
    private final String rootFolderIdConfig;
    private final String requestsFolderName;
    private final String sharedDriveId;
    private final boolean localFallbackEnabled;
    private final Path localRootPath;

    private volatile Drive drive;
    private volatile boolean useLocalStorage;
    private volatile String rootFolderId;
    private volatile String requestsFolderId;

    public GoogleDriveStorageService(ObjectProvider<Drive> driveProvider,
                                     @Value("${app.drive.root-folder-name:ExpenseControl}") String rootFolderName,
                                     @Value("${app.drive.root-folder-id:}") String rootFolderIdConfig,
                                     @Value("${app.drive.requests-folder-name:requests}") String requestsFolderName,
                                     @Value("${app.drive.shared-drive-id:}") String sharedDriveId,
                                     @Value("${app.attachments.local-fallback-enabled:true}") boolean localFallbackEnabled,
                                     @Value("${app.attachments.local-root:./storage/attachments}") String localRoot) {
        this.driveProvider = driveProvider;
        this.rootFolderName = rootFolderName;
        this.rootFolderIdConfig = rootFolderIdConfig == null ? "" : rootFolderIdConfig.trim();
        this.requestsFolderName = requestsFolderName;
        this.sharedDriveId = sharedDriveId == null ? "" : sharedDriveId.trim();
        this.localFallbackEnabled = localFallbackEnabled;
        this.localRootPath = Paths.get(localRoot).toAbsolutePath().normalize();
    }

    public String ensureFolder(Long requestId) {
        Drive currentDrive = resolveDriveOrFallback();
        if (currentDrive == null) {
            return ensureLocalFolder(requestId);
        }

        String rootId = ensureRootFolder(currentDrive);
        String requestsId = ensureRequestsFolder(currentDrive, rootId);
        return ensureChildFolder(currentDrive, requestsId, String.valueOf(requestId));
    }

    public String uploadFile(String driveFolderId, String storedName, org.springframework.web.multipart.MultipartFile file) {
        Drive currentDrive = resolveDriveOrFallback();
        if (currentDrive == null) {
            return uploadLocalFile(driveFolderId, storedName, file);
        }

        try {
            File metadata = new File();
            metadata.setName(storedName);
            metadata.setParents(List.of(driveFolderId));

            InputStreamContent mediaContent = new InputStreamContent(file.getContentType(), file.getInputStream());
            mediaContent.setLength(file.getSize());

            Drive.Files.Create create = currentDrive.files().create(metadata, mediaContent).setFields("id");
            if (hasSharedDrive()) {
                create.setSupportsAllDrives(true);
            }

            File uploaded = create.execute();
            return uploaded.getId();
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao enviar arquivo para o Drive.", ex);
        }
    }

    public InputStream downloadFile(String driveFileId) {
        Drive currentDrive = resolveDriveOrFallback();
        if (currentDrive == null || isLocalFileId(driveFileId)) {
            return downloadLocalFile(driveFileId);
        }

        try {
            Drive.Files.Get get = currentDrive.files().get(driveFileId);
            if (hasSharedDrive()) {
                get.setSupportsAllDrives(true);
            }
            return get.executeMediaAsInputStream();
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao baixar arquivo do Drive.", ex);
        }
    }

    public void deleteFile(String driveFileId) {
        Drive currentDrive = resolveDriveOrFallback();
        if (currentDrive == null || isLocalFileId(driveFileId)) {
            deleteLocalFile(driveFileId);
            return;
        }

        try {
            Drive.Files.Delete delete = currentDrive.files().delete(driveFileId);
            if (hasSharedDrive()) {
                delete.setSupportsAllDrives(true);
            }
            delete.execute();
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao remover arquivo do Drive.", ex);
        }
    }

    private String ensureRootFolder(Drive currentDrive) {
        if (rootFolderId != null) return rootFolderId;
        if (!rootFolderIdConfig.isBlank()) {
            rootFolderId = rootFolderIdConfig;
            return rootFolderId;
        }
        rootFolderId = findFolderId(currentDrive, null, rootFolderName);
        if (rootFolderId != null) return rootFolderId;

        File metadata = new File();
        metadata.setName(rootFolderName);
        metadata.setMimeType(FOLDER_MIME);
        if (hasSharedDrive()) {
            metadata.setParents(Collections.singletonList(sharedDriveId));
        }

        rootFolderId = createFolder(currentDrive, metadata);
        return rootFolderId;
    }

    private String ensureRequestsFolder(Drive currentDrive, String rootId) {
        if (requestsFolderId != null) return requestsFolderId;
        requestsFolderId = findFolderId(currentDrive, rootId, requestsFolderName);
        if (requestsFolderId != null) return requestsFolderId;

        File metadata = new File();
        metadata.setName(requestsFolderName);
        metadata.setMimeType(FOLDER_MIME);
        metadata.setParents(List.of(rootId));
        requestsFolderId = createFolder(currentDrive, metadata);
        return requestsFolderId;
    }

    private String ensureChildFolder(Drive currentDrive, String parentId, String name) {
        String existing = findFolderId(currentDrive, parentId, name);
        if (existing != null) return existing;

        File metadata = new File();
        metadata.setName(name);
        metadata.setMimeType(FOLDER_MIME);
        metadata.setParents(List.of(parentId));
        return createFolder(currentDrive, metadata);
    }

    private String createFolder(Drive currentDrive, File metadata) {
        try {
            Drive.Files.Create create = currentDrive.files().create(metadata).setFields("id");
            if (hasSharedDrive()) {
                create.setSupportsAllDrives(true);
            }
            return create.execute().getId();
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao criar pasta no Drive.", ex);
        }
    }

    private String findFolderId(Drive currentDrive, String parentId, String name) {
        try {
            String safeName = name.replace("'", "\'");
            StringBuilder query = new StringBuilder();
            query.append("mimeType='").append(FOLDER_MIME).append("' and name='")
                    .append(safeName).append("' and trashed=false");
            if (parentId != null) {
                query.append(" and '").append(parentId).append("' in parents");
            }

            Drive.Files.List list = currentDrive.files().list()
                    .setQ(query.toString())
                    .setPageSize(1)
                    .setFields("files(id, name)");

            if (hasSharedDrive()) {
                list.setSupportsAllDrives(true);
                list.setIncludeItemsFromAllDrives(true);
                list.setCorpora("drive");
                list.setDriveId(sharedDriveId);
            }

            FileList result = list.execute();
            if (result.getFiles() == null || result.getFiles().isEmpty()) {
                return null;
            }
            return result.getFiles().get(0).getId();
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao buscar pasta no Drive.", ex);
        }
    }

    private Drive resolveDriveOrFallback() {
        if (useLocalStorage) {
            return null;
        }
        if (drive != null) {
            return drive;
        }

        synchronized (this) {
            if (useLocalStorage) {
                return null;
            }
            if (drive != null) {
                return drive;
            }

            try {
                drive = driveProvider.getObject();
                return drive;
            } catch (Exception ex) {
                if (!localFallbackEnabled) {
                    throw new IllegalStateException(
                            "Google Drive nao configurado. Defina GOOGLE_OAUTH_REFRESH_TOKEN ou GOOGLE_SERVICE_ACCOUNT_JSON/FILE.",
                            ex
                    );
                }

                useLocalStorage = true;
                log.warn("Google Drive indisponivel; usando armazenamento local em {}", localRootPath);
                return null;
            }
        }
    }

    private String ensureLocalFolder(Long requestId) {
        if (requestId == null) {
            throw new IllegalArgumentException("ID da solicitacao obrigatorio para criar pasta local.");
        }

        try {
            Path folder = localRootPath.resolve(String.valueOf(requestId)).normalize();
            ensureWithinRoot(folder);
            Files.createDirectories(folder);
            return LOCAL_FOLDER_PREFIX + requestId;
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao criar pasta local de anexos.", ex);
        }
    }

    private String uploadLocalFile(String folderId,
                                   String storedName,
                                   org.springframework.web.multipart.MultipartFile file) {
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

    private InputStream downloadLocalFile(String fileId) {
        Path file = resolveLocalFile(fileId);
        try {
            return Files.newInputStream(file);
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao ler arquivo local.", ex);
        }
    }

    private void deleteLocalFile(String fileId) {
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

    private boolean hasSharedDrive() {
        return sharedDriveId != null && !sharedDriveId.isBlank();
    }
}
