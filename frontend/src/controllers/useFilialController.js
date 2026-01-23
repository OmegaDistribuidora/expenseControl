import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "./constants.js";
import { normalizePageResponse } from "./utils/pagination.js";
import { getErrorMessage } from "./utils/errors.js";
import {
  buildSolicitacaoPayload,
  emptyDraft,
  mapSolicitacaoToDraft,
  validateSolicitacaoDraft,
} from "./utils/solicitacao.js";

export const useFilialController = ({ requestAuthed, showNotice, attachments, enabled }) => {
  const [categories, setCategories] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [editId, setEditId] = useState(null);
  const [reenvioComentario, setReenvioComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("RECENT");

  const loadFilialData = useCallback(async () => {
    setLoading(true);
    try {
      const searchQuery = search.trim();
      const searchParam = searchQuery ? `q=${encodeURIComponent(searchQuery)}` : "";
      const sortParam = sort ? `sort=${sort}` : "";
      const [categoriesResponse, solicitacoesResponse] = await Promise.all([
        requestAuthed("/categorias"),
        requestAuthed(
          `/solicitacoes?${[searchParam, sortParam, `page=${page}`, `size=${DEFAULT_PAGE_SIZE}`]
            .filter(Boolean)
            .join("&")}`
        ),
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
  }, [page, requestAuthed, search, showNotice, sort]);

  useEffect(() => {
    if (!enabled) return;
    void loadFilialData();
  }, [enabled, loadFilialData]);

  useEffect(() => {
    const lastPage = totalPages > 0 ? totalPages - 1 : 0;
    if (page > lastPage) {
      setPage(lastPage);
    }
  }, [page, totalPages]);

  const selected = useMemo(() => {
    return solicitacoes.find((item) => item.id === selectedId) || null;
  }, [solicitacoes, selectedId]);

  useEffect(() => {
    if (solicitacoes.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!solicitacoes.some((item) => item.id === selectedId)) {
      setSelectedId(solicitacoes[0].id);
    }
  }, [solicitacoes, selectedId, search, page]);

  const updateDraft = (patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const updateSearch = (value) => {
    setSearch(value);
    setPage(0);
  };

  const updateSort = (value) => {
    setSort(value);
    setPage(0);
  };

  const updateLine = (index, patch) => {
    setDraft((prev) => ({
      ...prev,
      linhas: prev.linhas.map((linha, i) => (i === index ? { ...linha, ...patch } : linha)),
    }));
  };

  const removeLine = (index) => {
    setDraft((prev) => ({
      ...prev,
      linhas: prev.linhas.filter((_, i) => i !== index),
    }));
  };

  const updateReenvioComentario = (value) => {
    setReenvioComentario(value);
  };

  const startReenvio = () => {
    if (!selected || selected.status !== "PENDENTE_INFO") return;
    setEditId(selected.id);
    setDraft(mapSolicitacaoToDraft(selected));
    setReenvioComentario("");
    attachments.clearPendingAttachments();
  };

  const cancelReenvio = () => {
    setEditId(null);
    setDraft(emptyDraft());
    setReenvioComentario("");
    attachments.clearPendingAttachments();
  };

  const addLine = () => {
    setDraft((prev) => ({
      ...prev,
      linhas: [...prev.linhas, { descricao: "", valor: "", observacao: "" }],
    }));
  };

  const handleSubmitSolicitacao = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const validationError = validateSolicitacaoDraft(draft, reenvioComentario);
    if (validationError) {
      showNotice("error", validationError);
      return;
    }

    const payload = buildSolicitacaoPayload(draft);
    const wasEditing = Boolean(editId);

    setSubmitting(true);
    try {
      let saved = null;
      if (editId) {
        saved = await requestAuthed(`/solicitacoes/${editId}/reenvio`, {
          method: "PUT",
          body: JSON.stringify({
            comentario: reenvioComentario.trim() || null,
            dados: payload,
          }),
        });
        setEditId(null);
        setReenvioComentario("");
      } else {
        saved = await requestAuthed("/solicitacoes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      let successMessage = wasEditing ? "Solicitação reenviada." : "Solicitação enviada.";
      let noticeType = "success";

      if (!wasEditing && attachments.pendingAttachments.length > 0 && saved?.id) {
        const failures = await attachments.uploadPendingAttachments(saved.id, attachments.pendingAttachments);
        if (failures.length === 0) {
          successMessage += " Anexos enviados.";
          attachments.clearPendingAttachments();
        } else {
          noticeType = "error";
          successMessage += ` ${failures.length} anexo(s) falharam no envio.`;
          const firstError = failures[0]?.error;
          if (firstError) {
            successMessage += ` ${firstError}`;
          }
          attachments.replacePendingAttachments(failures.map((item) => item.file));
        }
        await attachments.loadAttachments(saved.id);
      } else {
        attachments.clearPendingAttachments();
      }

      showNotice(noticeType, successMessage);
      setDraft(emptyDraft());
      await loadFilialData();
      if (!wasEditing && saved?.id) {
        setSelectedId(saved.id);
      }
    } catch (error) {
      showNotice("error", getErrorMessage(error, "Erro ao salvar solicitação."));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = useCallback(() => {
    setCategories([]);
    setSolicitacoes([]);
    setSelectedId(null);
    setDraft(emptyDraft());
    setEditId(null);
    setReenvioComentario("");
    setLoading(false);
    setSubmitting(false);
    setPage(0);
    setTotal(0);
    setTotalPages(0);
    setSearch("");
    setSort("RECENT");
  }, []);

  return {
    categories,
    solicitacoes,
    solicitacoesTotal: total,
    selectedId,
    selected,
    draft,
    loading,
    saving: submitting,
    editId,
    reenvioComentario,
    search,
    sort,
    page,
    totalPages,
    setSearch: updateSearch,
    setSort: updateSort,
    setPage,
    setSelectedId,
    updateDraft,
    addLine,
    updateLine,
    removeLine,
    updateReenvioComentario,
    startReenvio,
    cancelReenvio,
    onSubmit: handleSubmitSolicitacao,
    reload: loadFilialData,
    reset,
  };
};
