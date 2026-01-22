import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "./constants.js";
import { normalizePageResponse } from "./utils/pagination.js";
import { sortSolicitacoes } from "./utils/search.js";
import { parseMoneyInput } from "./utils/money.js";
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
        const message = error instanceof Error ? error.message : "Erro ao carregar estatisticas.";
        showNotice("error", message);
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
      const queryString = [statusQuery, searchParam, `page=${page}`, `size=${DEFAULT_PAGE_SIZE}`]
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
      const message = error instanceof Error ? error.message : "Erro ao carregar dados.";
      showNotice("error", message);
    } finally {
      setLoading(false);
    }
  }, [page, requestAuthed, search, showNotice, statusFilter]);

  useEffect(() => {
    if (!enabled) return;
    void loadAdminData();
  }, [enabled, loadAdminData]);

  const filteredSolicitacoes = useMemo(() => {
    return sortSolicitacoes(solicitacoes, sort);
  }, [solicitacoes, sort]);

  useEffect(() => {
    if (filteredSolicitacoes.length === 0) {
      if (!search.trim() && solicitacoes.length === 0 && page > 0) {
        setPage((prev) => Math.max(prev - 1, 0));
        return;
      }
      setSelectedId(null);
      return;
    }
    if (!filteredSolicitacoes.some((item) => item.id === selectedId)) {
      setSelectedId(filteredSolicitacoes[0].id);
    }
  }, [filteredSolicitacoes, selectedId, search, page, solicitacoes.length]);

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
      const message = error instanceof Error ? error.message : "Erro ao criar categoria.";
      showNotice("error", message);
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
          const message = error instanceof Error ? error.message : "Erro ao inativar categoria.";
          showNotice("error", message);
        } finally {
          setCategorySaving(false);
        }
      },
    });
  };

  const handleDecision = async (decisao) => {
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
        const message = error instanceof Error ? error.message : "Erro ao decidir solicitacao.";
        showNotice("error", message);
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
    if (!selected || selected.status !== "PENDENTE") {
      showNotice("error", "Selecione uma solicitacao pendente.");
      return;
    }
    if (pedidoInfoLoading) return;

    const comentario = pedidoInfoForm.comentario.trim();
    const validationError = validatePedidoInfo(comentario);
    if (validationError) {
      showNotice("error", validationError);
      return;
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao pedir ajuste.";
      showNotice("error", message);
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
          const message = error instanceof Error ? error.message : "Erro ao excluir solicitacao.";
          showNotice("error", message);
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
    solicitacoes: filteredSolicitacoes,
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
    setSort,
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
