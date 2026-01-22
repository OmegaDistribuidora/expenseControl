import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, API_BASE } from "../models/api.js";
import { loadStoredAuth, saveStoredAuth } from "../models/storage.js";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE,
} from "./constants.js";
import { useAdminController } from "./useAdminController.js";
import { useFilialController } from "./useFilialController.js";

export const useAppController = () => {
  const [auth, setAuth] = useState(() => loadStoredAuth());
  const [profile, setProfile] = useState(null);
  const [notice, setNotice] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const noticeTimer = useRef(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ usuario: "", password: "" });

  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const lastAttachmentId = useRef(null);

  const showNotice = useCallback((type, message) => {
    setNotice({ type, message });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5000);
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const openConfirm = useCallback((config) => {
    setConfirmDialog({
      title: config?.title || "Confirmar",
      message: config?.message || "",
      confirmLabel: config?.confirmLabel || "Confirmar",
      cancelLabel: config?.cancelLabel || "Cancelar",
      intent: config?.intent || "danger",
      onConfirm: config?.onConfirm,
    });
  }, []);

  const closeConfirm = useCallback(() => {
    if (confirmLoading) return;
    setConfirmDialog(null);
  }, [confirmLoading]);

  const handleConfirm = useCallback(async () => {
    if (!confirmDialog?.onConfirm) {
      setConfirmDialog(null);
      return;
    }
    setConfirmLoading(true);
    try {
      await confirmDialog.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirmDialog(null);
    }
  }, [confirmDialog]);

  const requestAuthed = useCallback(
    async (path, options = {}) => apiRequest(path, options, auth?.basic),
    [auth?.basic],
  );

  const updateLoginForm = useCallback((patch) => {
    setLoginForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const validateAttachmentFile = useCallback((file) => {
    if (!file) return "Arquivo invalido.";
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return "Tipo de arquivo nao permitido.";
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return "Arquivo maior que 10MB.";
    }
    return null;
  }, []);

  const queuePendingAttachments = useCallback((files) => {
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
          showNotice("error", "Limite de 5 anexos por solicitacao.");
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
  }, [showNotice, validateAttachmentFile]);

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
        setAttachments([]);
        return;
      }
      setAttachmentsLoading(true);
      try {
        const data = await requestAuthed(`/solicitacoes/${solicitacaoId}/anexos`);
        setAttachments(Array.isArray(data) ? data : []);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao carregar anexos.";
        showNotice("error", message);
        setAttachments([]);
      } finally {
        setAttachmentsLoading(false);
      }
    },
    [requestAuthed, showNotice],
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
            const message = error instanceof Error ? error.message : "Erro ao enviar anexo.";
            failures.push({ file, error: message });
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
      if (!auth?.basic) {
        showNotice("error", "Usuario nao autenticado.");
        return;
      }
      const availableSlots = MAX_ATTACHMENTS - attachments.length;
      if (availableSlots <= 0) {
        showNotice("error", "Limite de 5 anexos por solicitacao.");
        return;
      }
      const filesToUpload = files.slice(0, availableSlots);
      if (filesToUpload.length < files.length) {
        showNotice("error", "Limite de 5 anexos por solicitacao.");
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
      auth?.basic,
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
        message: "Deseja excluir este anexo? Esta acao nao pode ser desfeita.",
        confirmLabel: "Excluir",
        intent: "danger",
        onConfirm: async () => {
          try {
            await requestAuthed(`/anexos/${attachmentId}`, {
              method: "DELETE",
            });
            showNotice("success", "Anexo excluido.");
            await loadAttachments(solicitacaoId);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao excluir anexo.";
            showNotice("error", message);
          }
        },
      });
    },
    [loadAttachments, openConfirm, requestAuthed, showNotice],
  );

  const handleDownloadAttachment = useCallback(
    async (attachment) => {
      if (!attachment?.id) return;
      if (!auth?.basic) {
        showNotice("error", "Usuario nao autenticado.");
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/anexos/${attachment.id}/download`, {
          headers: {
            Authorization: `Basic ${auth.basic}`,
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
        const message = error instanceof Error ? error.message : "Erro ao baixar anexo.";
        showNotice("error", message);
      }
    },
    [auth?.basic, showNotice],
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

  const profileType = profile?.tipo;

  const filial = useFilialController({
    requestAuthed,
    showNotice,
    attachments: attachmentsApi,
    enabled: profileType === "FILIAL",
  });

  const admin = useAdminController({
    requestAuthed,
    showNotice,
    openConfirm,
    enabled: profileType === "ADMIN",
  });

  const resetFilial = filial.reset;
  const resetAdmin = admin.reset;

  const handleLogout = useCallback(() => {
    setAuth(null);
    setProfile(null);
    setLoginForm({ usuario: "", password: "" });
    saveStoredAuth(null);
    setConfirmDialog(null);
    setConfirmLoading(false);
    setNotice(null);
    setAuthLoading(false);
    setAttachments([]);
    setAttachmentsLoading(false);
    setAttachmentsUploading(false);
    clearPendingAttachments();
    resetFilial();
    resetAdmin();
  }, [clearPendingAttachments, resetAdmin, resetFilial]);

  const loadProfile = useCallback(async () => {
    try {
      const profileData = await requestAuthed("/auth/me");
      setProfile(profileData);
    } catch {
      handleLogout();
    }
  }, [requestAuthed, handleLogout]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setNotice(null);

    try {
      const basic = btoa(`${loginForm.usuario}:${loginForm.password}`);
      const profileData = await apiRequest("/auth/me", {}, basic);
      const nextAuth = { usuario: loginForm.usuario, basic };
      setAuth(nextAuth);
      saveStoredAuth(nextAuth);
      setProfile(profileData);
      showNotice("success", "Login concluido.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no login.";
      showNotice("error", message);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!auth?.basic) return;
    void loadProfile();
  }, [auth?.basic, loadProfile]);

  useEffect(() => {
    if (!auth?.basic) return;
    if (!profileType) return;
    const solicitacaoId = profileType === "ADMIN" ? admin.selectedId : filial.selectedId;
    if (!solicitacaoId) {
      setAttachments([]);
      setAttachmentsLoading(false);
      lastAttachmentId.current = null;
      return;
    }
    if (lastAttachmentId.current !== solicitacaoId) {
      setAttachments([]);
      lastAttachmentId.current = solicitacaoId;
    }
    void loadAttachments(solicitacaoId);
  }, [admin.selectedId, auth?.basic, filial.selectedId, loadAttachments, profileType]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  return {
    apiBase: API_BASE,
    auth,
    profile,
    notice,
    dismissNotice,
    confirmDialog,
    confirmLoading,
    onConfirm: handleConfirm,
    onDismissConfirm: closeConfirm,
    authLoading,
    loginForm,
    updateLoginForm,
    onLogin: handleLogin,
    onLogout: handleLogout,
    filial: {
      ...filial,
      attachments,
      attachmentsLoading,
      attachmentsUploading,
      pendingAttachments,
      onQueueAttachments: queuePendingAttachments,
      onRemovePendingAttachment: removePendingAttachment,
      onClearPendingAttachments: clearPendingAttachments,
      onUploadAttachment: handleUploadAttachment,
      onUploadAttachments: handleUploadAttachments,
      onDownloadAttachment: handleDownloadAttachment,
      onDeleteAttachment: handleDeleteAttachment,
    },
    admin: {
      ...admin,
      attachments,
      attachmentsLoading,
      attachmentsUploading,
      onDownloadAttachment: handleDownloadAttachment,
      onDeleteAttachment: handleDeleteAttachment,
    },
  };
};
