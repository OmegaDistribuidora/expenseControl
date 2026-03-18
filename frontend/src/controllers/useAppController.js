import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, API_BASE } from "../models/api.js";
import { loadStoredAuth, saveStoredAuth } from "../models/storage.js";
import { getErrorMessage } from "./utils/errors.js";
import { useAttachmentsController } from "./useAttachmentsController.js";
import { useAdminController } from "./useAdminController.js";
import { useConfirmDialog } from "./useConfirmDialog.js";
import { useFilialController } from "./useFilialController.js";
import { useNotice } from "./useNotice.js";

const readSsoTokenFromHash = () => {
  try {
    const hash = String(window.location.hash || "").replace(/^#/, "");
    if (!hash) return null;
    const params = new URLSearchParams(hash);
    return params.get("sso");
  } catch {
    return null;
  }
};

const clearSsoHash = () => {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}`);
};

const getAuthorizationHeader = (auth) => auth?.authorization || null;

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
    async (path, options = {}) => apiRequest(path, options, getAuthorizationHeader(auth)),
    [auth],
  );

  const handleOwnPasswordChanged = useCallback((newPassword) => {
    if (auth?.authType !== "basic") return;
    const usuario = auth?.usuario;
    if (!usuario || !newPassword) return;
    const nextAuth = {
      usuario,
      authType: "basic",
      authorization: `Basic ${btoa(`${usuario}:${newPassword}`)}`,
    };
    setAuth(nextAuth);
    saveStoredAuth(nextAuth);
  }, [auth?.authType, auth?.usuario]);

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
    authHeader: getAuthorizationHeader(auth),
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
    currentUsuario: profile?.usuario || auth?.usuario || "",
    canApproveSolicitacao: Boolean(profile?.podeAprovarSolicitacao),
    isRootAdmin: Boolean(profile?.superAdmin),
    onOwnPasswordChanged: handleOwnPasswordChanged,
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
      const authorization = `Basic ${btoa(`${loginForm.usuario}:${loginForm.password}`)}`;
      const profileData = await apiRequest("/auth/me", {}, authorization);
      const nextAuth = {
        usuario: loginForm.usuario,
        authType: "basic",
        authorization,
      };
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
    if (!auth?.authorization) return;
    void loadProfile();
  }, [auth?.authorization, loadProfile]);

  useEffect(() => {
    const ssoToken = readSsoTokenFromHash();
    if (auth || !ssoToken) return;

    let alive = true;
    setAuthLoading(true);

    apiRequest("/auth/sso/exchange", {
      method: "POST",
      body: JSON.stringify({ token: ssoToken }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((payload) => {
        if (!alive) return;
        const token = String(payload?.token || "").trim();
        const profileData = payload?.profile || null;
        if (!token || !profileData?.usuario) {
          throw new Error("Resposta invalida do login delegado.");
        }

        const nextAuth = {
          usuario: profileData.usuario,
          authType: String(payload?.authType || "bearer").toLowerCase(),
          authorization: `Bearer ${token}`,
        };
        setAuth(nextAuth);
        saveStoredAuth(nextAuth);
        setProfile(profileData);
        dismissNotice();
      })
      .catch((error) => {
        if (!alive) return;
        handleLogout();
        showNotice("error", getErrorMessage(error, "Falha ao validar login vindo do Ecossistema."));
      })
      .finally(() => {
        clearSsoHash();
        if (alive) {
          setAuthLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [auth, dismissNotice, handleLogout, showNotice]);

  useEffect(() => {
    if (!auth?.authorization) return;
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
    auth?.authorization,
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
