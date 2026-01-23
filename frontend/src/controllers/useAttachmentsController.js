import { useCallback, useMemo, useState } from "react";
import { API_BASE } from "../models/api.js";
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENTS, MAX_ATTACHMENT_SIZE } from "./constants.js";
import { getErrorMessage } from "./utils/errors.js";

export const useAttachmentsController = ({ requestAuthed, authBasic, showNotice, openConfirm }) => {
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);

  const validateAttachmentFile = useCallback((file) => {
    if (!file) return "Arquivo inválido.";
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return "Tipo de arquivo não permitido.";
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return "Arquivo maior que 10MB.";
    }
    return null;
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
    setAttachmentsLoading(false);
  }, []);

  const resetAttachments = useCallback(() => {
    setAttachments([]);
    setAttachmentsLoading(false);
    setAttachmentsUploading(false);
    setPendingAttachments([]);
  }, []);

  const queuePendingAttachments = useCallback(
    (files) => {
      if (!files || files.length === 0) return;
      setPendingAttachments((prev) => {
        const next = [...prev];
        for (const file of files) {
          const validationError = validateAttachmentFile(file);
          if (validationError) {
            showNotice("error", validationError);
            continue;
          }
          if (next.length >= MAX_ATTACHMENTS) {
            showNotice("error", "Limite de 5 anexos por solicitação.");
            break;
          }
          const exists = next.some(
            (item) =>
              item.name === file.name &&
              item.size === file.size &&
              item.lastModified === file.lastModified,
          );
          if (exists) continue;
          next.push(file);
        }
        return next;
      });
    },
    [showNotice, validateAttachmentFile],
  );

  const removePendingAttachment = useCallback((index) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments([]);
  }, []);

  const replacePendingAttachments = useCallback((files) => {
    setPendingAttachments(Array.isArray(files) ? files : []);
  }, []);

  const loadAttachments = useCallback(
    async (solicitacaoId) => {
      if (!solicitacaoId) {
        clearAttachments();
        return;
      }
      setAttachmentsLoading(true);
      try {
        const data = await requestAuthed(`/solicitacoes/${solicitacaoId}/anexos`);
        setAttachments(Array.isArray(data) ? data : []);
      } catch (error) {
        showNotice("error", getErrorMessage(error, "Erro ao carregar anexos."));
        setAttachments([]);
      } finally {
        setAttachmentsLoading(false);
      }
    },
    [clearAttachments, requestAuthed, showNotice],
  );

  const uploadPendingAttachments = useCallback(
    async (solicitacaoId, files) => {
      const failures = [];
      setAttachmentsUploading(true);
      try {
        for (const file of files) {
          const validationError = validateAttachmentFile(file);
          if (validationError) {
            failures.push({ file, error: validationError });
            continue;
          }
          try {
            const formData = new FormData();
            formData.append("file", file);
            await requestAuthed(`/solicitacoes/${solicitacaoId}/anexos`, {
              method: "POST",
              body: formData,
            });
          } catch (error) {
            failures.push({ file, error: getErrorMessage(error, "Erro ao enviar anexo.") });
          }
        }
      } finally {
        setAttachmentsUploading(false);
      }
      return failures;
    },
    [requestAuthed, validateAttachmentFile],
  );

  const handleUploadAttachments = useCallback(
    async (files, solicitacaoId) => {
      if (!files || files.length === 0 || !solicitacaoId) return;
      if (attachmentsLoading) {
        showNotice("error", "Aguarde o carregamento dos anexos.");
        return;
      }
      if (!authBasic) {
        showNotice("error", "Usuário não autenticado.");
        return;
      }
      const availableSlots = MAX_ATTACHMENTS - attachments.length;
      if (availableSlots <= 0) {
        showNotice("error", "Limite de 5 anexos por solicitação.");
        return;
      }
      const filesToUpload = files.slice(0, availableSlots);
      if (filesToUpload.length < files.length) {
        showNotice("error", "Limite de 5 anexos por solicitação.");
      }
      const failures = await uploadPendingAttachments(solicitacaoId, filesToUpload);
      if (failures.length === 0) {
        showNotice("success", "Anexo(s) enviados.");
      } else {
        const firstError = failures[0]?.error;
        const message = firstError
          ? `Falha ao enviar anexo. ${firstError}`
          : "Falha ao enviar anexo.";
        showNotice("error", message);
      }
      await loadAttachments(solicitacaoId);
    },
    [
      attachments.length,
      attachmentsLoading,
      authBasic,
      loadAttachments,
      showNotice,
      uploadPendingAttachments,
    ],
  );

  const handleUploadAttachment = useCallback(
    async (file, solicitacaoId) => {
      await handleUploadAttachments([file], solicitacaoId);
    },
    [handleUploadAttachments],
  );

  const handleDeleteAttachment = useCallback(
    (attachmentId, solicitacaoId) => {
      if (!attachmentId || !solicitacaoId) return;
      openConfirm({
        title: "Excluir anexo",
        message: "Deseja excluir este anexo? Esta ação não pode ser desfeita.",
        confirmLabel: "Excluir",
        intent: "danger",
        onConfirm: async () => {
          try {
            await requestAuthed(`/anexos/${attachmentId}`, {
              method: "DELETE",
            });
            showNotice("success", "Anexo excluído.");
            await loadAttachments(solicitacaoId);
          } catch (error) {
            showNotice("error", getErrorMessage(error, "Erro ao excluir anexo."));
          }
        },
      });
    },
    [loadAttachments, openConfirm, requestAuthed, showNotice],
  );

  const handleDownloadAttachment = useCallback(
    async (attachment) => {
      if (!attachment?.id) return;
      if (!authBasic) {
        showNotice("error", "Usuário não autenticado.");
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/anexos/${attachment.id}/download`, {
          headers: {
            Authorization: `Basic ${authBasic}`,
          },
        });

        if (!response.ok) {
          let payload = null;
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            payload = await response.json();
          }
          const fallback = `${response.status} ${response.statusText}`.trim();
          const details = payload?.details?.length ? ` (${payload.details.join("; ")})` : "";
          throw new Error(`${payload?.message || payload?.error || fallback}${details}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = attachment.originalName || "arquivo";
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        showNotice("error", getErrorMessage(error, "Erro ao baixar anexo."));
      }
    },
    [authBasic, showNotice],
  );

  const attachmentsApi = useMemo(
    () => ({
      pendingAttachments,
      uploadPendingAttachments,
      clearPendingAttachments,
      replacePendingAttachments,
      loadAttachments,
    }),
    [
      clearPendingAttachments,
      loadAttachments,
      pendingAttachments,
      replacePendingAttachments,
      uploadPendingAttachments,
    ],
  );

  return {
    attachments,
    attachmentsLoading,
    attachmentsUploading,
    pendingAttachments,
    attachmentsApi,
    clearAttachments,
    resetAttachments,
    queuePendingAttachments,
    removePendingAttachment,
    clearPendingAttachments,
    uploadPendingAttachments,
    loadAttachments,
    handleUploadAttachment,
    handleUploadAttachments,
    handleDownloadAttachment,
    handleDeleteAttachment,
  };
};
