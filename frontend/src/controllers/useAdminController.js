import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "./constants.js";
import { normalizePageResponse } from "./utils/pagination.js";
import { parseMoneyInput } from "./utils/money.js";
import { getErrorMessage } from "./utils/errors.js";
import { validateCategoryForm, validateDecisionForm, validatePedidoInfo } from "./utils/validation.js";

const NEW_REQUEST_NOTIFICATION_INTERVAL_MS = 20000;
const NEW_REQUEST_CHECK_SIZE = 20;

export const useAdminController = ({
  requestAuthed,
  showNotice,
  openConfirm,
  enabled,
  currentUsuario,
  canApproveSolicitacao,
  isRootAdmin,
  onOwnPasswordChanged,
}) => {
  const [categories, setCategories] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("PENDENTE");
  const [loading, setLoading] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [pedidoInfoLoading, setPedidoInfoLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const statsRef = useRef(null);
  const statsLoadingRef = useRef(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("RECENT");
  const [users, setUsers] = useState([]);
  const [filiaisDisponiveis, setFiliaisDisponiveis] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [createUserSaving, setCreateUserSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ usuario: "", novaSenha: "", senhaAtual: "" });
  const [createUserForm, setCreateUserForm] = useState({
    usuario: "",
    nome: "",
    senha: "",
    podeAprovarSolicitacao: false,
    filiaisVisiveis: [],
  });
  const [categoryForm, setCategoryForm] = useState({ nome: "", descricao: "" });
  const [decisionForm, setDecisionForm] = useState({ valorAprovado: "", comentario: "" });
  const [pedidoInfoForm, setPedidoInfoForm] = useState({ comentario: "" });
  const pendingMonitorInitializedRef = useRef(false);
  const lastPendingMaxIdRef = useRef(0);
  const notificationPromptedRef = useRef(false);

  const updateCategoryForm = (patch) => {
    setCategoryForm((prev) => ({ ...prev, ...patch }));
  };

  const updateDecisionForm = (patch) => {
    setDecisionForm((prev) => ({ ...prev, ...patch }));
  };

  const updatePedidoInfoForm = (patch) => {
    setPedidoInfoForm((prev) => ({ ...prev, ...patch }));
  };

  const updateStatusFilter = (nextStatus) => {
    setStatusFilter(nextStatus);
    setPage(0);
  };

  const updateSearch = (value) => {
    setSearch(value);
    setPage(0);
  };

  const updateSort = (value) => {
    setSort(value);
    setPage(0);
  };

  const updatePasswordForm = (patch) => {
    setPasswordForm((prev) => ({ ...prev, ...patch }));
  };

  const updateCreateUserForm = (patch) => {
    setCreateUserForm((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    statsLoadingRef.current = statsLoading;
  }, [statsLoading]);

  const notifyNewRequests = useCallback(
    (newCount) => {
      const total = Number.isFinite(newCount) && newCount > 1 ? newCount : 1;
      const message =
        total === 1
          ? "Nova solicitacao pendente no sistema."
          : `${total} novas solicitacoes pendentes no sistema.`;

      if (typeof window === "undefined" || !("Notification" in window)) {
        showNotice("success", message);
        return;
      }

      if (Notification.permission === "granted") {
        const notification = new Notification("Expense Control", {
          body: message,
          tag: "pending-solicitacao",
          renotify: true,
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        return;
      }

      showNotice("success", message);
    },
    [showNotice],
  );

  const checkNewPendingRequests = useCallback(async () => {
    if (!enabled || !canApproveSolicitacao) return;

    try {
      const response = await requestAuthed(
        `/admin/solicitacoes?status=PENDENTE&sort=RECENT&page=0&size=${NEW_REQUEST_CHECK_SIZE}`,
      );
      const pageData = normalizePageResponse(response);
      const ids = pageData.items
        .map((item) => Number(item.id))
        .filter((id) => Number.isFinite(id) && id > 0);
      const currentMaxId = ids.length > 0 ? Math.max(...ids) : 0;

      if (!pendingMonitorInitializedRef.current) {
        pendingMonitorInitializedRef.current = true;
        lastPendingMaxIdRef.current = currentMaxId;
        return;
      }

      const previousMaxId = lastPendingMaxIdRef.current;
      if (currentMaxId > previousMaxId) {
        const newCount = ids.filter((id) => id > previousMaxId).length;
        notifyNewRequests(newCount);
      }

      if (currentMaxId > lastPendingMaxIdRef.current) {
        lastPendingMaxIdRef.current = currentMaxId;
      }
    } catch {
      // Ignora erro para nao interromper a tela por falha temporaria de polling.
    }
  }, [canApproveSolicitacao, enabled, notifyNewRequests, requestAuthed]);

  const loadStats = useCallback(
    async (force = false) => {
      if (!enabled) return;
      if (!force && statsRef.current) return;
      if (statsLoadingRef.current) return;
      setStatsLoading(true);
      try {
        const endpoint = force
          ? `/admin/solicitacoes/estatisticas?ts=${Date.now()}`
          : "/admin/solicitacoes/estatisticas";
        const statsResponse = await requestAuthed(endpoint);
        setStats(statsResponse);
      } catch (error) {
        showNotice("error", getErrorMessage(error, "Erro ao carregar estatisticas."));
      } finally {
        setStatsLoading(false);
      }
    },
    [enabled, requestAuthed, showNotice],
  );

  const loadUsers = useCallback(async () => {
    if (!enabled) return;
    setUsersLoading(true);
    try {
      const [usersResponse, filiaisResponse] = await Promise.all([
        requestAuthed("/admin/contas"),
        requestAuthed("/admin/contas/filiais"),
      ]);
      const list = Array.isArray(usersResponse) ? usersResponse : [];
      const filiais = Array.isArray(filiaisResponse) ? filiaisResponse : [];
      setUsers(list);
      setFiliaisDisponiveis(filiais);
      setPasswordForm((prev) => {
        if (prev.usuario && list.some((item) => item.usuario === prev.usuario)) {
          return prev;
        }
        const preferred = list.find((item) => item.usuario === currentUsuario)?.usuario || list[0]?.usuario || "";
        return { ...prev, usuario: preferred };
      });
    } catch (error) {
      showNotice("error", getErrorMessage(error, "Erro ao carregar usuarios."));
    } finally {
      setUsersLoading(false);
    }
  }, [currentUsuario, enabled, requestAuthed, showNotice]);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const statusQuery = statusFilter === "TODOS" ? "" : `status=${statusFilter}`;
      const searchQuery = search.trim();
      const searchParam = searchQuery ? `q=${encodeURIComponent(searchQuery)}` : "";
      const sortParam = sort ? `sort=${sort}` : "";
      const queryString = [statusQuery, searchParam, sortParam, `page=${page}`, `size=${DEFAULT_PAGE_SIZE}`]
        .filter(Boolean)
        .join("&");
      const [categoriesResponse, solicitacoesResponse] = await Promise.all([
        requestAuthed("/admin/categorias"),
        requestAuthed(`/admin/solicitacoes?${queryString}`),
      ]);
      const pagina = normalizePageResponse(solicitacoesResponse);
      setCategories(Array.isArray(categoriesResponse) ? categoriesResponse : []);
      setSolicitacoes(pagina.items);
      setTotal(pagina.totalElements);
      setTotalPages(pagina.totalPages);
    } catch (error) {
      showNotice("error", getErrorMessage(error, "Erro ao carregar dados."));
    } finally {
      setLoading(false);
    }
  }, [page, requestAuthed, search, showNotice, sort, statusFilter]);

  useEffect(() => {
    if (!enabled) return;
    void loadAdminData();
  }, [enabled, loadAdminData]);

  useEffect(() => {
    if (!enabled) return;
    void loadUsers();
  }, [enabled, loadUsers]);

  useEffect(() => {
    if (!enabled || !canApproveSolicitacao) {
      pendingMonitorInitializedRef.current = false;
      lastPendingMaxIdRef.current = 0;
      return;
    }
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (notificationPromptedRef.current) return;
    notificationPromptedRef.current = true;
    void Notification.requestPermission().catch(() => {});
  }, [canApproveSolicitacao, enabled]);

  useEffect(() => {
    if (!enabled || !canApproveSolicitacao) {
      pendingMonitorInitializedRef.current = false;
      lastPendingMaxIdRef.current = 0;
      return undefined;
    }

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await checkNewPendingRequests();
    };

    void tick();
    const intervalId = window.setInterval(() => {
      void tick();
    }, NEW_REQUEST_NOTIFICATION_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [canApproveSolicitacao, checkNewPendingRequests, enabled]);

  useEffect(() => {
    const lastPage = totalPages > 0 ? totalPages - 1 : 0;
    if (page > lastPage) {
      setPage(lastPage);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (solicitacoes.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!solicitacoes.some((item) => item.id === selectedId)) {
      setSelectedId(solicitacoes[0].id);
    }
  }, [solicitacoes, selectedId, search, page]);

  const selected = useMemo(() => {
    return solicitacoes.find((item) => item.id === selectedId) || null;
  }, [solicitacoes, selectedId]);

  useEffect(() => {
    setDecisionForm({ valorAprovado: "", comentario: "" });
    setPedidoInfoForm({ comentario: "" });
  }, [selectedId]);

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    if (categorySaving) return;

    const validationError = validateCategoryForm(categoryForm);
    if (validationError) {
      showNotice("error", validationError);
      return;
    }

    const payload = {
      nome: categoryForm.nome.trim(),
      descricao: categoryForm.descricao.trim() || null,
    };

    setCategorySaving(true);
    try {
      await requestAuthed("/admin/categorias", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showNotice("success", "Categoria criada.");
      setCategoryForm({ nome: "", descricao: "" });
      await loadAdminData();
    } catch (error) {
      showNotice("error", getErrorMessage(error, "Erro ao criar categoria."));
    } finally {
      setCategorySaving(false);
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
        if (categorySaving) return;
        setCategorySaving(true);
        try {
          await requestAuthed(`/admin/categorias/${categoria.id}/inativar`, {
            method: "PATCH",
          });
          showNotice("success", "Categoria inativada.");
          await loadAdminData();
        } catch (error) {
          showNotice("error", getErrorMessage(error, "Erro ao inativar categoria."));
        } finally {
          setCategorySaving(false);
        }
      },
    });
  };

  const handleDecision = async (decisao) => {
    if (!canApproveSolicitacao) {
      showNotice("error", "Seu usuario nao tem permissao para aprovar ou solicitar ajuste.");
      return;
    }
    if (!selected || selected.status !== "PENDENTE") {
      showNotice("error", "Selecione uma solicitacao pendente.");
      return;
    }
    if (decisionLoading) return;

    const validationError = validateDecisionForm(decisao, decisionForm);
    if (validationError) {
      showNotice("error", validationError);
      return;
    }

    const applyDecision = async () => {
      setDecisionLoading(true);

      const valorAprovado = decisionForm.valorAprovado.trim();
      const payload = {
        decisao,
        valorAprovado: decisao === "APROVADO" && valorAprovado ? parseMoneyInput(valorAprovado) : null,
        comentario: decisionForm.comentario.trim() || null,
      };

      try {
        await requestAuthed(`/admin/solicitacoes/${selected.id}/decisao`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showNotice("success", "Decisao registrada.");
        setDecisionForm({ valorAprovado: "", comentario: "" });
        await loadAdminData();
        await loadStats(true);
      } catch (error) {
        showNotice("error", getErrorMessage(error, "Erro ao decidir solicitacao."));
      } finally {
        setDecisionLoading(false);
      }
    };

    if (decisao === "REPROVADO") {
      openConfirm({
        title: "Reprovar solicitacao",
        message: "Tem certeza que deseja reprovar esta solicitacao?",
        confirmLabel: "Reprovar",
        intent: "danger",
        onConfirm: applyDecision,
      });
      return;
    }

    await applyDecision();
  };

  const handlePedidoInfo = async () => {
    if (!canApproveSolicitacao) {
      showNotice("error", "Seu usuario nao tem permissao para aprovar ou solicitar ajuste.");
      return false;
    }
    if (!selected || selected.status !== "PENDENTE") {
      showNotice("error", "Selecione uma solicitacao pendente.");
      return false;
    }
    if (pedidoInfoLoading) return false;

    const comentario = pedidoInfoForm.comentario.trim();
    const validationError = validatePedidoInfo(comentario);
    if (validationError) {
      showNotice("error", validationError);
      return false;
    }

    setPedidoInfoLoading(true);
    try {
      await requestAuthed(`/admin/solicitacoes/${selected.id}/pedido-info`, {
        method: "PATCH",
        body: JSON.stringify({ comentario }),
      });
      showNotice("success", "Pedido de ajuste enviado.");
      setPedidoInfoForm({ comentario: "" });
      await loadAdminData();
      await loadStats(true);
      return true;
    } catch (error) {
      showNotice("error", getErrorMessage(error, "Erro ao pedir ajuste."));
      return false;
    } finally {
      setPedidoInfoLoading(false);
    }
  };

  const handleDeleteSolicitacao = async () => {
    if (!selected) {
      showNotice("error", "Selecione uma solicitacao.");
      return;
    }
    openConfirm({
      title: "Excluir solicitacao",
      message: "Tem certeza que deseja excluir esta solicitacao? Essa acao nao pode ser desfeita.",
      confirmLabel: "Excluir",
      intent: "danger",
      onConfirm: async () => {
        if (deleteLoading) return;
        setDeleteLoading(true);
        try {
          await requestAuthed(`/admin/solicitacoes/${selected.id}`, {
            method: "DELETE",
          });
          showNotice("success", "Solicitacao excluida.");
          await loadAdminData();
          await loadStats(true);
        } catch (error) {
          showNotice("error", getErrorMessage(error, "Erro ao excluir solicitacao."));
        } finally {
          setDeleteLoading(false);
        }
      },
    });
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (passwordSaving) return;

    const usuario = passwordForm.usuario.trim();
    const novaSenha = passwordForm.novaSenha.trim();
    const senhaAtual = passwordForm.senhaAtual.trim();

    if (!usuario) {
      showNotice("error", "Selecione o usuario.");
      return;
    }
    if (novaSenha.length < 6) {
      showNotice("error", "A nova senha deve ter no minimo 6 caracteres.");
      return;
    }

    const isOwnUser = usuario === currentUsuario;
    if (isOwnUser && !senhaAtual) {
      showNotice("error", "Informe sua senha atual para alterar a propria senha.");
      return;
    }

    setPasswordSaving(true);
    try {
      await requestAuthed(`/admin/contas/${encodeURIComponent(usuario)}/senha`, {
        method: "PUT",
        body: JSON.stringify({
          novaSenha,
          senhaAtual: isOwnUser ? senhaAtual : null,
        }),
      });

      if (isOwnUser) {
        onOwnPasswordChanged?.(novaSenha);
      }

      showNotice("success", `Senha alterada para ${usuario}.`);
      setPasswordForm((prev) => ({
        ...prev,
        novaSenha: "",
        senhaAtual: "",
      }));
    } catch (error) {
      showNotice("error", getErrorMessage(error, "Erro ao alterar senha."));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    if (!isRootAdmin) {
      showNotice("error", "Apenas o usuario admin pode criar novas contas.");
      return;
    }
    if (createUserSaving) return;

    const usuario = createUserForm.usuario.trim().toLowerCase();
    const nome = createUserForm.nome.trim();
    const senha = createUserForm.senha.trim();
    const filiais = Array.isArray(createUserForm.filiaisVisiveis) ? createUserForm.filiaisVisiveis : [];

    if (!usuario) {
      showNotice("error", "Informe o usuario.");
      return;
    }
    if (!nome) {
      showNotice("error", "Informe o nome.");
      return;
    }
    if (senha.length < 6) {
      showNotice("error", "A senha deve ter no minimo 6 caracteres.");
      return;
    }
    if (filiais.length === 0) {
      showNotice("error", "Selecione ao menos uma filial visivel.");
      return;
    }

    setCreateUserSaving(true);
    try {
      await requestAuthed("/admin/contas", {
        method: "POST",
        body: JSON.stringify({
          usuario,
          nome,
          senha,
          podeAprovarSolicitacao: Boolean(createUserForm.podeAprovarSolicitacao),
          filiaisVisiveis: filiais,
        }),
      });
      showNotice("success", `Usuario ${usuario} criado com sucesso.`);
      setCreateUserForm({
        usuario: "",
        nome: "",
        senha: "",
        podeAprovarSolicitacao: false,
        filiaisVisiveis: [],
      });
      await loadUsers();
    } catch (error) {
      showNotice("error", getErrorMessage(error, "Erro ao criar usuario."));
    } finally {
      setCreateUserSaving(false);
    }
  };

  const reset = useCallback(() => {
    setCategories([]);
    setSolicitacoes([]);
    setSelectedId(null);
    setStatusFilter("PENDENTE");
    setLoading(false);
    setCategorySaving(false);
    setDecisionLoading(false);
    setPedidoInfoLoading(false);
    setDeleteLoading(false);
    setStats(null);
    setStatsLoading(false);
    setPage(0);
    setTotal(0);
    setTotalPages(0);
    setSearch("");
    setSort("RECENT");
    setUsers([]);
    setFiliaisDisponiveis([]);
    setUsersLoading(false);
    setPasswordSaving(false);
    setCreateUserSaving(false);
    setPasswordForm({ usuario: "", novaSenha: "", senhaAtual: "" });
    setCreateUserForm({
      usuario: "",
      nome: "",
      senha: "",
      podeAprovarSolicitacao: false,
      filiaisVisiveis: [],
    });
    setCategoryForm({ nome: "", descricao: "" });
    setDecisionForm({ valorAprovado: "", comentario: "" });
    setPedidoInfoForm({ comentario: "" });
    pendingMonitorInitializedRef.current = false;
    lastPendingMaxIdRef.current = 0;
    notificationPromptedRef.current = false;
  }, []);

  return {
    categories,
    solicitacoes,
    solicitacoesTotal: total,
    selectedId,
    selected,
    statusFilter,
    loading,
    categorySaving,
    decisionLoading,
    pedidoInfoLoading,
    deleteLoading,
    categoryForm,
    decisionForm,
    pedidoInfoForm,
    stats,
    statsLoading,
    search,
    sort,
    users,
    filiaisDisponiveis,
    usersLoading,
    passwordForm,
    passwordSaving,
    createUserForm,
    createUserSaving,
    page,
    totalPages,
    setSelectedId,
    setStatusFilter: updateStatusFilter,
    setSearch: updateSearch,
    setSort: updateSort,
    setPage,
    updateCategoryForm,
    updateDecisionForm,
    updatePedidoInfoForm,
    onCreateCategory: handleCreateCategory,
    onDeactivateCategory: handleDeactivateCategory,
    onDecision: handleDecision,
    onPedidoInfo: handlePedidoInfo,
    onDeleteSolicitacao: handleDeleteSolicitacao,
    onUpdatePasswordForm: updatePasswordForm,
    onSubmitPassword: handleChangePassword,
    onUpdateCreateUserForm: updateCreateUserForm,
    onCreateUser: handleCreateUser,
    onLoadStats: loadStats,
    reload: loadAdminData,
    reset,
  };
};
