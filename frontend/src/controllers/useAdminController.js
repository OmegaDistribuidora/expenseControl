import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "./constants.js";
import { normalizePageResponse } from "./utils/pagination.js";
import { parseMoneyInput } from "./utils/money.js";
import { getErrorMessage } from "./utils/errors.js";
import { validateCategoryForm, validateDecisionForm, validatePedidoInfo } from "./utils/validation.js";

export const useAdminController = ({ requestAuthed, showNotice, openConfirm, enabled }) => {
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
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("RECENT");
  const [categoryForm, setCategoryForm] = useState({ nome: "", descricao: "" });
  const [decisionForm, setDecisionForm] = useState({ valorAprovado: "", comentario: "" });
  const [pedidoInfoForm, setPedidoInfoForm] = useState({ comentario: "" });

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

  const loadStats = useCallback(
    async (force = false) => {
      if (!enabled) return;
      if (!force && stats) return;
      if (statsLoading) return;
      setStatsLoading(true);
      try {
        const statsResponse = await requestAuthed("/admin/solicitacoes/estatisticas");
        setStats(statsResponse);
      } catch (error) {
        showNotice("error", getErrorMessage(error, "Erro ao carregar estatísticas."));
      } finally {
        setStatsLoading(false);
      }
    },
    [enabled, requestAuthed, showNotice, stats, statsLoading],
  );

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
      message: `Deseja inativar a categoria \"${categoria.nome}\"?`,
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
    if (!selected || selected.status !== "PENDENTE") {
      showNotice("error", "Selecione uma solicitação pendente.");
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
        showNotice("success", "Decisão registrada.");
        setDecisionForm({ valorAprovado: "", comentario: "" });
        await loadAdminData();
        await loadStats(true);
      } catch (error) {
        showNotice("error", getErrorMessage(error, "Erro ao decidir solicitação."));
      } finally {
        setDecisionLoading(false);
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
    if (!selected || selected.status !== "PENDENTE") {
      showNotice("error", "Selecione uma solicitação pendente.");
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
      showNotice("error", "Selecione uma solicitação.");
      return;
    }
    openConfirm({
      title: "Excluir solicitação",
      message: "Tem certeza que deseja excluir esta solicitação? Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      intent: "danger",
      onConfirm: async () => {
        if (deleteLoading) return;
        setDeleteLoading(true);
        try {
          await requestAuthed(`/admin/solicitacoes/${selected.id}`, {
            method: "DELETE",
          });
          showNotice("success", "Solicitação excluída.");
          await loadAdminData();
          await loadStats(true);
        } catch (error) {
          showNotice("error", getErrorMessage(error, "Erro ao excluir solicitação."));
        } finally {
          setDeleteLoading(false);
        }
      },
    });
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
    setCategoryForm({ nome: "", descricao: "" });
    setDecisionForm({ valorAprovado: "", comentario: "" });
    setPedidoInfoForm({ comentario: "" });
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
    onLoadStats: loadStats,
    reload: loadAdminData,
    reset,
  };
};
