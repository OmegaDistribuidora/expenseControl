package com.app.expenseControl.service;

import com.app.expenseControl.dto.AttachmentResponseDTO;
import com.app.expenseControl.entity.Attachment;
import com.app.expenseControl.entity.Conta;
import com.app.expenseControl.entity.Solicitacao;
import com.app.expenseControl.enums.StatusSolicitacao;
import com.app.expenseControl.enums.TipoConta;
import com.app.expenseControl.repository.AttachmentRepository;
import com.app.expenseControl.repository.ContaRepository;
import com.app.expenseControl.repository.SolicitacaoRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class AttachmentService {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;
    private static final int MAX_ATTACHMENTS = 5;
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/jpg"
    );

    private final AttachmentRepository attachmentRepository;
    private final SolicitacaoRepository solicitacaoRepository;
    private final ContaRepository contaRepository;
    private final GoogleDriveStorageService driveStorageService;

    public AttachmentService(AttachmentRepository attachmentRepository,
                             SolicitacaoRepository solicitacaoRepository,
                             ContaRepository contaRepository,
                             @Lazy GoogleDriveStorageService driveStorageService) {
        this.attachmentRepository = attachmentRepository;
        this.solicitacaoRepository = solicitacaoRepository;
        this.contaRepository = contaRepository;
        this.driveStorageService = driveStorageService;
    }

    @Transactional
    public AttachmentResponseDTO upload(Long solicitacaoId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo não enviado.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo excede 10MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de arquivo não permitido.");
        }

        Solicitacao solicitacao = buscarSolicitacao(solicitacaoId);
        Conta conta = getContaLogada();
        ensureAccess(conta, solicitacao);
        ensureStatusAllowsAttachment(solicitacao);

        long total = attachmentRepository.countBySolicitacaoId(solicitacaoId);
        if (total >= MAX_ATTACHMENTS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limite de anexos atingido.");
        }

        String originalName = sanitizeOriginalName(file.getOriginalFilename());
        long nextIndex = total + 1;
        String storedName = buildStoredName(solicitacao, originalName, nextIndex);
        String folderId = driveStorageService.ensureFolder(solicitacaoId);
        String driveFileId = driveStorageService.uploadFile(folderId, storedName, file);

        Attachment attachment = Attachment.builder()
                .solicitacao(solicitacao)
                .driveFileId(driveFileId)
                .driveFolderId(folderId)
                .originalName(originalName)
                .storedName(storedName)
                .contentType(contentType)
                .size(file.getSize())
                .uploadedBy(conta.getUsuario())
                .build();

        Attachment saved = attachmentRepository.save(attachment);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponseDTO> listBySolicitacao(Long solicitacaoId) {
        Solicitacao solicitacao = buscarSolicitacao(solicitacaoId);
        Conta conta = getContaLogada();
        ensureAccess(conta, solicitacao);

        return attachmentRepository.findBySolicitacaoIdOrderByCreatedAtAsc(solicitacaoId)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public AttachmentDownload download(Long attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anexo não encontrado."));
        Solicitacao solicitacao = attachment.getSolicitacao();

        Conta conta = getContaLogada();
        ensureAccess(conta, solicitacao);

        return new AttachmentDownload(attachment, driveStorageService.downloadFile(attachment.getDriveFileId()));
    }

    @Transactional
    public void delete(Long attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anexo não encontrado."));
        Solicitacao solicitacao = attachment.getSolicitacao();

        Conta conta = getContaLogada();
        ensureAccess(conta, solicitacao);
        ensureStatusAllowsAttachment(solicitacao);

        driveStorageService.deleteFile(attachment.getDriveFileId());
        attachmentRepository.delete(attachment);
    }

    @Transactional
    public void deleteAllForSolicitacao(Long solicitacaoId) {
        List<Attachment> attachments = attachmentRepository.findBySolicitacaoIdOrderByCreatedAtAsc(solicitacaoId);
        for (Attachment attachment : attachments) {
            driveStorageService.deleteFile(attachment.getDriveFileId());
        }
        attachmentRepository.deleteAll(attachments);
    }

    private Solicitacao buscarSolicitacao(Long solicitacaoId) {
        return solicitacaoRepository.findById(solicitacaoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitação não encontrada."));
    }

    private void ensureAccess(Conta conta, Solicitacao solicitacao) {
        if (conta.getTipo() == TipoConta.ADMIN) {
            return;
        }
        if (conta.getTipo() != TipoConta.FILIAL) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Conta sem permissão para anexos.");
        }
        if (conta.getFilial() == null || !conta.getFilial().equals(solicitacao.getFilial())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solicitação não pertence à filial.");
        }
    }

    private void ensureStatusAllowsAttachment(Solicitacao solicitacao) {
        if (solicitacao.getStatus() != StatusSolicitacao.PENDENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solicitação não aceita anexos neste status.");
        }
    }

    private String sanitizeOriginalName(String originalName) {
        if (originalName == null || originalName.isBlank()) {
            return "arquivo";
        }
        String normalized = originalName.replace("\\", "/");
        int idx = normalized.lastIndexOf("/");
        return idx >= 0 ? normalized.substring(idx + 1) : normalized;
    }

    private String buildStoredName(Solicitacao solicitacao, String originalName, long sequence) {
        String ext = "";
        int dot = originalName.lastIndexOf('.');
        if (dot > -1 && dot < originalName.length() - 1) {
            ext = originalName.substring(dot + 1).toLowerCase();
        }
        String titulo = solicitacao != null ? solicitacao.getTitulo() : "";
        String slug = slugify(titulo);
        String base = String.format(Locale.ROOT, "solicitacao-%d-%s-%03d", solicitacao.getId(), slug, sequence);
        return ext.isBlank() ? base : base + "." + ext;
    }

    private String slugify(String value) {
        if (value == null) {
            return "sem-titulo";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return normalized.isBlank() ? "sem-titulo" : normalized;
    }

    private AttachmentResponseDTO toDTO(Attachment attachment) {
        return new AttachmentResponseDTO(
                attachment.getId(),
                attachment.getSolicitacao().getId(),
                attachment.getDriveFolderId(),
                attachment.getOriginalName(),
                attachment.getStoredName(),
                attachment.getContentType(),
                attachment.getSize(),
                attachment.getUploadedBy(),
                attachment.getCreatedAt()
        );
    }

    private Conta getContaLogada() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado.");
        }

        String usuario = auth.getName();
        return contaRepository.findByUsuario(usuario)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Conta autenticada não encontrada no banco."
                ));
    }
}
