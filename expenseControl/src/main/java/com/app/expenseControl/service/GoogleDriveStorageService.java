package com.app.expenseControl.service;

import com.google.api.client.http.InputStreamContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;

@Service
@Lazy
public class GoogleDriveStorageService {

    private static final String FOLDER_MIME = "application/vnd.google-apps.folder";

    private final Drive drive;
    private final String rootFolderName;
    private final String rootFolderIdConfig;
    private final String requestsFolderName;
    private final String sharedDriveId;

    private volatile String rootFolderId;
    private volatile String requestsFolderId;

    public GoogleDriveStorageService(Drive drive,
                                     @Value("${app.drive.root-folder-name:ExpenseControl}") String rootFolderName,
                                     @Value("${app.drive.root-folder-id:}") String rootFolderIdConfig,
                                     @Value("${app.drive.requests-folder-name:requests}") String requestsFolderName,
                                     @Value("${app.drive.shared-drive-id:}") String sharedDriveId) {
        this.drive = drive;
        this.rootFolderName = rootFolderName;
        this.rootFolderIdConfig = rootFolderIdConfig == null ? "" : rootFolderIdConfig.trim();
        this.requestsFolderName = requestsFolderName;
        this.sharedDriveId = sharedDriveId == null ? "" : sharedDriveId.trim();
    }

    public String ensureFolder(Long requestId) {
        String rootId = ensureRootFolder();
        String requestsId = ensureRequestsFolder(rootId);
        return ensureChildFolder(requestsId, String.valueOf(requestId));
    }

    public String uploadFile(String driveFolderId, String storedName, org.springframework.web.multipart.MultipartFile file) {
        try {
            File metadata = new File();
            metadata.setName(storedName);
            metadata.setParents(List.of(driveFolderId));

            InputStreamContent mediaContent = new InputStreamContent(file.getContentType(), file.getInputStream());
            mediaContent.setLength(file.getSize());

            Drive.Files.Create create = drive.files().create(metadata, mediaContent).setFields("id");
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
        try {
            Drive.Files.Get get = drive.files().get(driveFileId);
            if (hasSharedDrive()) {
                get.setSupportsAllDrives(true);
            }
            return get.executeMediaAsInputStream();
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao baixar arquivo do Drive.", ex);
        }
    }

    public void deleteFile(String driveFileId) {
        try {
            Drive.Files.Delete delete = drive.files().delete(driveFileId);
            if (hasSharedDrive()) {
                delete.setSupportsAllDrives(true);
            }
            delete.execute();
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao remover arquivo do Drive.", ex);
        }
    }

    private String ensureRootFolder() {
        if (rootFolderId != null) return rootFolderId;
        if (!rootFolderIdConfig.isBlank()) {
            rootFolderId = rootFolderIdConfig;
            return rootFolderId;
        }
        rootFolderId = findFolderId(null, rootFolderName);
        if (rootFolderId != null) return rootFolderId;

        File metadata = new File();
        metadata.setName(rootFolderName);
        metadata.setMimeType(FOLDER_MIME);
        if (hasSharedDrive()) {
            metadata.setParents(Collections.singletonList(sharedDriveId));
        }

        rootFolderId = createFolder(metadata);
        return rootFolderId;
    }

    private String ensureRequestsFolder(String rootId) {
        if (requestsFolderId != null) return requestsFolderId;
        requestsFolderId = findFolderId(rootId, requestsFolderName);
        if (requestsFolderId != null) return requestsFolderId;

        File metadata = new File();
        metadata.setName(requestsFolderName);
        metadata.setMimeType(FOLDER_MIME);
        metadata.setParents(List.of(rootId));
        requestsFolderId = createFolder(metadata);
        return requestsFolderId;
    }

    private String ensureChildFolder(String parentId, String name) {
        String existing = findFolderId(parentId, name);
        if (existing != null) return existing;

        File metadata = new File();
        metadata.setName(name);
        metadata.setMimeType(FOLDER_MIME);
        metadata.setParents(List.of(parentId));
        return createFolder(metadata);
    }

    private String createFolder(File metadata) {
        try {
            Drive.Files.Create create = drive.files().create(metadata).setFields("id");
            if (hasSharedDrive()) {
                create.setSupportsAllDrives(true);
            }
            return create.execute().getId();
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao criar pasta no Drive.", ex);
        }
    }

    private String findFolderId(String parentId, String name) {
        try {
            String safeName = name.replace("'", "\'");
            StringBuilder query = new StringBuilder();
            query.append("mimeType='").append(FOLDER_MIME).append("' and name='")
                    .append(safeName).append("' and trashed=false");
            if (parentId != null) {
                query.append(" and '").append(parentId).append("' in parents");
            }

            Drive.Files.List list = drive.files().list()
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

    private boolean hasSharedDrive() {
        return sharedDriveId != null && !sharedDriveId.isBlank();
    }
}
