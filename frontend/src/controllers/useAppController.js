import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, API_BASE } from "../models/api.js";
import { loadStoredAuth, saveStoredAuth } from "../models/storage.js";
import { getErrorMessage } from "./utils/errors.js";
import { useAttachmentsController } from "./useAttachmentsController.js";
import { useAdminController } from "./useAdminController.js";
import { useConfirmDialog } from "./useConfirmDialog.js";
import { useFilialController } from "./useFilialController.js";
import { useNotice } from "./useNotice.js";

export const useAppController = () => {
  const [auth, setAuth] = useState(() => loadStoredAuth());
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ usuario: "", password: "" });
  const lastAttachmentId = useRef(null);

  const { notice, showNotice, dismissNotice } = useNotice();
  const {
    confirmDialog,
    confirmLoading,
    openConfirm,
    closeConfirm,
    handleConfirm,
    resetConfirm,
  } = useConfirmDialog();

  const requestAuthed = useCallback(
    async (path, options = {}) => apiRequest(path, options, auth?.basic),
    [auth?.basic],
  );

  const updateLoginForm = useCallback((patch) => {
    setLoginForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const {
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
    handleUploadAttachment,
    handleUploadAttachments,
    handleDownloadAttachment,
    handleDeleteAttachment,
    loadAttachments,
  } = useAttachmentsController({
    requestAuthed,
    authBasic: auth?.basic,
    showNotice,
    openConfirm,
  });

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
    resetConfirm();
    dismissNotice();
    setAuthLoading(false);
    resetAttachments();
    resetFilial();
    resetAdmin();
  }, [dismissNotice, resetAdmin, resetAttachments, resetConfirm, resetFilial]);

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
    dismissNotice();

    try {
      const basic = btoa(`${loginForm.usuario}:${loginForm.password}`);
      const profileData = await apiRequest("/auth/me", {}, basic);
      const nextAuth = { usuario: loginForm.usuario, basic };
      setAuth(nextAuth);
      saveStoredAuth(nextAuth);
      setProfile(profileData);
      showNotice("success", "Login conclu\u00eddo.");
    } catch (error) {
      showNotice("error", getErrorMessage(error, "Falha no login."));
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
      clearAttachments();
      lastAttachmentId.current = null;
      return;
    }
    if (lastAttachmentId.current !== solicitacaoId) {
      clearAttachments();
      lastAttachmentId.current = solicitacaoId;
    }
    void loadAttachments(solicitacaoId);
  }, [
    admin.selectedId,
    auth?.basic,
    clearAttachments,
    filial.selectedId,
    loadAttachments,
    profileType,
  ]);

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
