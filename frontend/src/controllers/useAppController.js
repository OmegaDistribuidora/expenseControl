import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, API_BASE } from "../models/api.js";
import { loadStoredAuth, saveStoredAuth } from "../models/storage.js";

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

const parseMoneyInput = (value) => {
  if (typeof value === "number") return value;
  const cleaned = String(value || "").replace(/[^\d,.]/g, "");
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const sepIndex = Math.max(lastComma, lastDot);
  if (sepIndex == -1) {
    const digits = cleaned.replace(/\D/g, "");
    if (!digits) return null;
    return Number(digits);
  }
  const intPart = cleaned.slice(0, sepIndex).replace(/\D/g, "");
  const decPart = cleaned.slice(sepIndex + 1).replace(/\D/g, "").slice(0, 2);
  if (!intPart && !decPart) return null;
  return Number(`${intPart || "0"}.${decPart.padEnd(2, "0")}`);
};

const emptyDraft = () => ({
  categoriaId: "",
  titulo: "",
  solicitanteNome: "",
  descricao: "",
  ondeVaiSerUsado: "",
  valorEstimado: "",
  fornecedor: "",
  formaPagamento: "",
  observacoes: "",
  linhas: [],
});

const mapSolicitacaoToDraft = (solicitacao) => ({
  categoriaId: solicitacao?.categoriaId ? String(solicitacao.categoriaId) : "",
  titulo: solicitacao?.titulo || "",
  solicitanteNome: solicitacao?.solicitanteNome || "",
  descricao: solicitacao?.descricao || "",
  ondeVaiSerUsado: solicitacao?.ondeVaiSerUsado || "",
  valorEstimado: solicitacao?.valorEstimado ?? "",
  fornecedor: solicitacao?.fornecedor || "",
  formaPagamento: solicitacao?.formaPagamento || "",
  observacoes: solicitacao?.observacoes || "",
  linhas: (solicitacao?.linhas || []).map((linha) => ({
    descricao: linha.descricao || "",
    valor: linha.valor ?? "",
    observacao: linha.observacao || "",
  })),
});

const buildSolicitacaoPayload = (draft) => ({
  categoriaId: Number(draft.categoriaId),
  titulo: draft.titulo.trim(),
  solicitanteNome: draft.solicitanteNome.trim(),
  descricao: draft.descricao.trim(),
  ondeVaiSerUsado: draft.ondeVaiSerUsado.trim(),
  valorEstimado: parseMoneyInput(draft.valorEstimado),
  fornecedor: draft.fornecedor.trim() || null,
  formaPagamento: draft.formaPagamento.trim() || null,
  observacoes: draft.observacoes.trim() || null,
  linhas: draft.linhas
    .filter((linha) => linha.descricao.trim() && String(linha.valor || "").trim())
    .map((linha) => ({
      descricao: linha.descricao.trim(),
      valor: parseMoneyInput(linha.valor),
      observacao: linha.observacao.trim() || null,
    })),
});

const normalizeText = (value) => {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const buildSearchText = (item) => {
  return [
    item?.titulo,
    item?.solicitanteNome,
    item?.filial,
    item?.categoriaNome,
    item?.fornecedor,
    item?.descricao,
    item?.status,
    item?.id,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
};

const getSolicitacaoTimestamp = (item) => {
  const value = item?.enviadoEm || item?.criadoEm || item?.decididoEm;
  const time = value ? Date.parse(value) : 0;
  return Number.isNaN(time) ? 0 : time;
};

const sortSolicitacoes = (items, sortKey) => {
  const list = [...items];
  const sorter = {
    RECENT: (a, b) => getSolicitacaoTimestamp(b) - getSolicitacaoTimestamp(a),
    OLD: (a, b) => getSolicitacaoTimestamp(a) - getSolicitacaoTimestamp(b),
    VALUE_DESC: (a, b) => (b?.valorEstimado || 0) - (a?.valorEstimado || 0),
    VALUE_ASC: (a, b) => (a?.valorEstimado || 0) - (b?.valorEstimado || 0),
    TITLE: (a, b) => normalizeText(a?.titulo).localeCompare(normalizeText(b?.titulo)),
  }[sortKey];

  if (sorter) {
    list.sort((a, b) => {
      const result = sorter(a, b);
      if (result !== 0) return result;
      return (a?.id || 0) - (b?.id || 0);
    });
  }
  return list;
};

export const useAppController = () => {
  const [auth, setAuth] = useState(() => loadStoredAuth());
  const [profile, setProfile] = useState(null);
  const [notice, setNotice] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const noticeTimer = useRef(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ usuario: "", password: "" });

  const [filialCategories, setFilialCategories] = useState([]);
  const [filialSolicitacoes, setFilialSolicitacoes] = useState([]);
  const [filialSelectedId, setFilialSelectedId] = useState(null);
  const [filialDraft, setFilialDraft] = useState(emptyDraft());
  const [filialEditId, setFilialEditId] = useState(null);
  const [filialReenvioComentario, setFilialReenvioComentario] = useState("");
  const [filialLoading, setFilialLoading] = useState(false);
  const [filialSearch, setFilialSearch] = useState("");
  const [filialSort, setFilialSort] = useState("RECENT");

  const [adminCategories, setAdminCategories] = useState([]);
  const [adminSolicitacoes, setAdminSolicitacoes] = useState([]);
  const [adminSelectedId, setAdminSelectedId] = useState(null);
  const [adminStatus, setAdminStatus] = useState("PENDENTE");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminSort, setAdminSort] = useState("RECENT");
  const [categoryForm, setCategoryForm] = useState({ nome: "", descricao: "" });
  const [decisionForm, setDecisionForm] = useState({ valorAprovado: "", comentario: "" });
  const [pedidoInfoForm, setPedidoInfoForm] = useState({ comentario: "" });

  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);

  const showNotice = useCallback((type, message) => {
    setNotice({ type, message });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5000);
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const openConfirm = (config) => {
    setConfirmDialog({
      title: config?.title || "Confirmar",
      message: config?.message || "",
      confirmLabel: config?.confirmLabel || "Confirmar",
      cancelLabel: config?.cancelLabel || "Cancelar",
      intent: config?.intent || "danger",
      onConfirm: config?.onConfirm,
    });
  };

  const closeConfirm = () => {
    if (confirmLoading) return;
    setConfirmDialog(null);
  };

  const handleConfirm = async () => {
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
  };

  const validateAttachmentFile = (file) => {
    if (!file) return "Arquivo inválido.";
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return "Tipo de arquivo não permitido.";
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return "Arquivo maior que 10MB.";
    }
    return null;
  };

  const queuePendingAttachments = (files) => {
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
        const exists = next.some((item) => (
          item.name === file.name &&
          item.size === file.size &&
          item.lastModified === file.lastModified
        ));
        if (exists) continue;
        next.push(file);
      }
      return next;
    });
  };

  const removePendingAttachment = (index) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments([]);
  }, []);

  const requestAuthed = useCallback(async (path, options = {}) => {
    return apiRequest(path, options, auth?.basic);
  }, [auth?.basic]);

  const updateLoginForm = (patch) => {
    setLoginForm((prev) => ({ ...prev, ...patch }));
  };

  const updateFilialDraft = (patch) => {
    setFilialDraft((prev) => ({ ...prev, ...patch }));
  };

  const updateFilialLine = (index, patch) => {
    setFilialDraft((prev) => ({
      ...prev,
      linhas: prev.linhas.map((linha, i) => (i === index ? { ...linha, ...patch } : linha)),
    }));
  };

  const removeFilialLine = (index) => {
    setFilialDraft((prev) => ({
      ...prev,
      linhas: prev.linhas.filter((_, i) => i !== index),
    }));
  };

  const updateCategoryForm = (patch) => {
    setCategoryForm((prev) => ({ ...prev, ...patch }));
  };

  const updateDecisionForm = (patch) => {
    setDecisionForm((prev) => ({ ...prev, ...patch }));
  };

  const updatePedidoInfoForm = (patch) => {
    setPedidoInfoForm((prev) => ({ ...prev, ...patch }));
  };

  const updateFilialReenvioComentario = (value) => {
    setFilialReenvioComentario(value);
  };

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
      showNotice("success", "Login concluído.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no login.";
      showNotice("error", message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = useCallback(() => {
    setAuth(null);
    setProfile(null);
    setLoginForm({ usuario: "", password: "" });
    saveStoredAuth(null);
    setConfirmDialog(null);
    setConfirmLoading(false);
    setFilialCategories([]);
    setFilialSolicitacoes([]);
    setFilialSelectedId(null);
    setFilialDraft(emptyDraft());
    setFilialEditId(null);
    setFilialReenvioComentario("");
    setFilialSearch("");
    setFilialSort("RECENT");
    setAdminCategories([]);
    setAdminSolicitacoes([]);
    setAdminSelectedId(null);
    setAdminStatus("PENDENTE");
    setAdminSearch("");
    setAdminSort("RECENT");
    setCategoryForm({ nome: "", descricao: "" });
    setDecisionForm({ valorAprovado: "", comentario: "" });
    setPedidoInfoForm({ comentario: "" });
    setAttachments([]);
    setAttachmentsLoading(false);
    setAttachmentsUploading(false);
    clearPendingAttachments();
  }, [clearPendingAttachments]);

  const loadProfile = useCallback(async () => {
    try {
      const profileData = await requestAuthed("/auth/me");
      setProfile(profileData);
    } catch {
      handleLogout();
    }
  }, [requestAuthed, handleLogout]);

  const loadFilialData = useCallback(async () => {
    setFilialLoading(true);
    try {
      const [categories, solicitacoes] = await Promise.all([
        requestAuthed("/categorias"),
        requestAuthed("/solicitacoes"),
      ]);
      setFilialCategories(categories);
      setFilialSolicitacoes(solicitacoes);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar dados.";
      showNotice("error", message);
    } finally {
      setFilialLoading(false);
    }
  }, [requestAuthed, showNotice]);

  const loadAdminData = useCallback(async () => {
    setAdminLoading(true);
    try {
      const statusQuery = adminStatus === "TODOS" ? "" : `?status=${adminStatus}`;
      const [categories, solicitacoes] = await Promise.all([
        requestAuthed("/admin/categorias"),
        requestAuthed(`/admin/solicitacoes${statusQuery}`),
      ]);
      setAdminCategories(categories);
      setAdminSolicitacoes(solicitacoes);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar dados.";
      showNotice("error", message);
    } finally {
      setAdminLoading(false);
    }
  }, [requestAuthed, showNotice, adminStatus]);

  const loadAttachments = useCallback(async (solicitacaoId) => {
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
  }, [requestAuthed, showNotice]);

  const handleUploadAttachment = async (file, solicitacaoId) => {
    await handleUploadAttachments([file], solicitacaoId);
  };

  const handleUploadAttachments = async (files, solicitacaoId) => {
    if (!files || files.length === 0 || !solicitacaoId) return;
    if (!auth?.basic) {
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
      const message = firstError ? `Falha ao enviar anexo. ${firstError}` : "Falha ao enviar anexo.";
      showNotice("error", message);
    }
    await loadAttachments(solicitacaoId);
  };

  const handleDeleteAttachment = async (attachmentId, solicitacaoId) => {
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
          const message = error instanceof Error ? error.message : "Erro ao excluir anexo.";
          showNotice("error", message);
        }
      },
    });
  };

  const handleDownloadAttachment = async (attachment) => {
    if (!attachment?.id) return;
    if (!auth?.basic) {
      showNotice("error", "Usuário não autenticado.");
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
  };

  const uploadPendingAttachments = async (solicitacaoId, files) => {
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
  };

  const filteredFilialSolicitacoes = useMemo(() => {
    const query = normalizeText(filialSearch);
    const base = filialSolicitacoes.filter((item) => {
      if (!query) return true;
      return buildSearchText(item).includes(query);
    });
    return sortSolicitacoes(base, filialSort);
  }, [filialSolicitacoes, filialSearch, filialSort]);

  const filteredAdminSolicitacoes = useMemo(() => {
    const query = normalizeText(adminSearch);
    const base = adminSolicitacoes.filter((item) => {
      if (!query) return true;
      return buildSearchText(item).includes(query);
    });
    return sortSolicitacoes(base, adminSort);
  }, [adminSolicitacoes, adminSearch, adminSort]);

  const profileType = profile?.tipo;

  useEffect(() => {
    if (!auth?.basic) return;
    void loadProfile();
  }, [auth?.basic, loadProfile]);

  useEffect(() => {
    if (profileType !== "FILIAL") return;
    void loadFilialData();
  }, [profileType, loadFilialData]);

  useEffect(() => {
    if (profileType !== "ADMIN") return;
    void loadAdminData();
  }, [profileType, loadAdminData]);

  useEffect(() => {
    if (filteredFilialSolicitacoes.length === 0) {
      setFilialSelectedId(null);
      return;
    }
    if (!filteredFilialSolicitacoes.some((item) => item.id === filialSelectedId)) {
      setFilialSelectedId(filteredFilialSolicitacoes[0].id);
    }
  }, [filteredFilialSolicitacoes, filialSelectedId]);

  useEffect(() => {
    if (filteredAdminSolicitacoes.length === 0) {
      setAdminSelectedId(null);
      return;
    }
    if (!filteredAdminSolicitacoes.some((item) => item.id === adminSelectedId)) {
      setAdminSelectedId(filteredAdminSolicitacoes[0].id);
    }
  }, [filteredAdminSolicitacoes, adminSelectedId]);

  useEffect(() => {
    setDecisionForm({ valorAprovado: "", comentario: "" });
    setPedidoInfoForm({ comentario: "" });
    setAttachments([]);
    setAttachmentsLoading(false);
    setAttachmentsUploading(false);
  }, [adminSelectedId]);

  useEffect(() => {
    if (!auth?.basic) return;
    if (!profileType) return;
    const solicitacaoId = profileType === "ADMIN" ? adminSelectedId : filialSelectedId;
    if (!solicitacaoId) {
      setAttachments([]);
      return;
    }
    void loadAttachments(solicitacaoId);
  }, [auth?.basic, profileType, adminSelectedId, filialSelectedId, loadAttachments]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  const selectedFilial = useMemo(() => {
    return filialSolicitacoes.find((item) => item.id === filialSelectedId) || null;
  }, [filialSelectedId, filialSolicitacoes]);

  const selectedAdmin = useMemo(() => {
    return adminSolicitacoes.find((item) => item.id === adminSelectedId) || null;
  }, [adminSelectedId, adminSolicitacoes]);

  const startFilialReenvio = () => {
    if (!selectedFilial || selectedFilial.status !== "PENDENTE_INFO") return;
    setFilialEditId(selectedFilial.id);
    setFilialDraft(mapSolicitacaoToDraft(selectedFilial));
    setFilialReenvioComentario("");
    clearPendingAttachments();
  };

  const cancelFilialReenvio = () => {
    setFilialEditId(null);
    setFilialDraft(emptyDraft());
    setFilialReenvioComentario("");
    clearPendingAttachments();
  };

  const handleSubmitSolicitacao = async (event) => {
    event.preventDefault();
    setNotice(null);

    const payload = buildSolicitacaoPayload(filialDraft);
    const wasEditing = Boolean(filialEditId);

    try {
      let saved = null;
      if (filialEditId) {
        saved = await requestAuthed(`/solicitacoes/${filialEditId}/reenvio`, {
          method: "PUT",
          body: JSON.stringify({
            comentario: filialReenvioComentario.trim() || null,
            dados: payload,
          }),
        });
        setFilialEditId(null);
        setFilialReenvioComentario("");
      } else {
        saved = await requestAuthed("/solicitacoes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      let successMessage = wasEditing ? "Solicitação reenviada." : "Solicitação enviada.";
      let noticeType = "success";

      if (!wasEditing && pendingAttachments.length > 0 && saved?.id) {
        const failures = await uploadPendingAttachments(saved.id, pendingAttachments);
        if (failures.length === 0) {
          successMessage += " Anexos enviados.";
          clearPendingAttachments();
        } else {
          noticeType = "error";
          successMessage += ` ${failures.length} anexo(s) falharam no envio.`;
          const firstError = failures[0]?.error;
          if (firstError) {
            successMessage += ` ${firstError}`;
          }
          setPendingAttachments(failures.map((item) => item.file));
        }
        await loadAttachments(saved.id);
      } else {
        clearPendingAttachments();
      }

      showNotice(noticeType, successMessage);
      setFilialDraft(emptyDraft());
      await loadFilialData();
      if (!wasEditing && saved?.id) {
        setFilialSelectedId(saved.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar solicitação.";
      showNotice("error", message);
    }
  };

  const addFilialLine = () => {
    setFilialDraft((prev) => ({
      ...prev,
      linhas: [...prev.linhas, { descricao: "", valor: "", observacao: "" }],
    }));
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    setNotice(null);

    const payload = {
      nome: categoryForm.nome.trim(),
      descricao: categoryForm.descricao.trim() || null,
    };

    try {
      await requestAuthed("/admin/categorias", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showNotice("success", "Categoria criada.");
      setCategoryForm({ nome: "", descricao: "" });
      await loadAdminData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar categoria.";
      showNotice("error", message);
    }
  };

  const handleDeactivateCategory = (categoria) => {
    if (!categoria?.id) return;
    openConfirm({
      title: "Inativar categoria",
      message: `Deseja inativar a categoria "${categoria.nome}"?`,
      confirmLabel: "Inativar",
      intent: "danger",
      onConfirm: async () => {
        try {
          await requestAuthed(`/admin/categorias/${categoria.id}/inativar`, {
            method: "PATCH",
          });
          showNotice("success", "Categoria inativada.");
          await loadAdminData();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao inativar categoria.";
          showNotice("error", message);
        }
      },
    });
  };

  const handleDecision = async (decisao) => {
    if (!selectedAdmin || selectedAdmin.status !== "PENDENTE") {
      showNotice("error", "Selecione uma solicitação pendente.");
      return;
    }
    const applyDecision = async () => {
      setNotice(null);

      const valorAprovado = decisionForm.valorAprovado.trim();
      const payload = {
        decisao,
        valorAprovado: decisao === "APROVADO" && valorAprovado ? parseMoneyInput(valorAprovado) : null,
        comentario: decisionForm.comentario.trim() || null,
      };

      try {
        await requestAuthed(`/admin/solicitacoes/${selectedAdmin.id}/decisao`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showNotice("success", "Decisão registrada.");
        setDecisionForm({ valorAprovado: "", comentario: "" });
        await loadAdminData();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao decidir solicitação.";
        showNotice("error", message);
      }
    };

    if (decisao === "REPROVADO") {
      openConfirm({
        title: "Reprovar solicitação",
        message: "Tem certeza que deseja reprovar esta solicitação?",
        confirmLabel: "Reprovar",
        intent: "danger",
        onConfirm: applyDecision,
      });
      return;
    }

    await applyDecision();
  };

  const handlePedidoInfo = async () => {
    if (!selectedAdmin || selectedAdmin.status !== "PENDENTE") {
      showNotice("error", "Selecione uma solicitação pendente.");
      return;
    }

    const comentario = pedidoInfoForm.comentario.trim();
    if (!comentario) {
      showNotice("error", "Informe o comentário para o pedido.");
      return;
    }

    try {
      await requestAuthed(`/admin/solicitacoes/${selectedAdmin.id}/pedido-info`, {
        method: "PATCH",
        body: JSON.stringify({ comentario }),
      });
      showNotice("success", "Pedido de ajuste enviado.");
      setPedidoInfoForm({ comentario: "" });
      await loadAdminData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao pedir ajuste.";
      showNotice("error", message);
    }
  };

  const handleDeleteSolicitacao = async () => {
    if (!selectedAdmin) {
      showNotice("error", "Selecione uma solicitação.");
      return;
    }
    openConfirm({
      title: "Excluir solicitação",
      message: "Tem certeza que deseja excluir esta solicitação? Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      intent: "danger",
      onConfirm: async () => {
        try {
          await requestAuthed(`/admin/solicitacoes/${selectedAdmin.id}`, {
            method: "DELETE",
          });
          showNotice("success", "Solicitação excluída.");
          await loadAdminData();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao excluir solicitação.";
          showNotice("error", message);
        }
      },
    });
  };

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
      categories: filialCategories,
      solicitacoes: filteredFilialSolicitacoes,
      solicitacoesTotal: filialSolicitacoes.length,
      selectedId: filialSelectedId,
      selected: selectedFilial,
      draft: filialDraft,
      loading: filialLoading,
      editId: filialEditId,
      reenvioComentario: filialReenvioComentario,
      search: filialSearch,
      sort: filialSort,
      setSearch: setFilialSearch,
      setSort: setFilialSort,
      setSelectedId: setFilialSelectedId,
      updateDraft: updateFilialDraft,
      addLine: addFilialLine,
      updateLine: updateFilialLine,
      removeLine: removeFilialLine,
      updateReenvioComentario: updateFilialReenvioComentario,
      startReenvio: startFilialReenvio,
      cancelReenvio: cancelFilialReenvio,
      onSubmit: handleSubmitSolicitacao,
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
      categories: adminCategories,
      solicitacoes: filteredAdminSolicitacoes,
      solicitacoesTotal: adminSolicitacoes.length,
      selectedId: adminSelectedId,
      selected: selectedAdmin,
      statusFilter: adminStatus,
      loading: adminLoading,
      categoryForm,
      decisionForm,
      pedidoInfoForm,
      search: adminSearch,
      sort: adminSort,
      setSelectedId: setAdminSelectedId,
      setStatusFilter: setAdminStatus,
      setSearch: setAdminSearch,
      setSort: setAdminSort,
      updateCategoryForm,
      updateDecisionForm,
      updatePedidoInfoForm,
      onCreateCategory: handleCreateCategory,
      onDeactivateCategory: handleDeactivateCategory,
      onDecision: handleDecision,
      onPedidoInfo: handlePedidoInfo,
      onDeleteSolicitacao: handleDeleteSolicitacao,
      attachments,
      attachmentsLoading,
      attachmentsUploading,
      onDownloadAttachment: handleDownloadAttachment,
      onDeleteAttachment: handleDeleteAttachment,
    },
  };
};
