import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "./constants.js";
import { normalizePageResponse } from "./utils/pagination.js";
import { sortSolicitacoes } from "./utils/search.js";
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
      const [categoriesResponse, solicitacoesResponse] = await Promise.all([
        requestAuthed("/categorias"),
        requestAuthed(
          `/solicitacoes?${[searchParam, `page=${page}`, `size=${DEFAULT_PAGE_SIZE}`]
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
      const message = error instanceof Error ? error.message : "Erro ao carregar dados.";
      showNotice("error", message);
    } finally {
      setLoading(false);
    }
  }, [page, requestAuthed, search, showNotice]);

  useEffect(() => {
    if (!enabled) return;
    void loadFilialData();
  }, [enabled, loadFilialData]);

  const filteredSolicitacoes = useMemo(() => {
    return sortSolicitacoes(solicitacoes, sort);
  }, [solicitacoes, sort]);

  const selected = useMemo(() => {
    return solicitacoes.find((item) => item.id === selectedId) || null;
  }, [solicitacoes, selectedId]);

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

  const updateDraft = (patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const updateSearch = (value) => {
    setSearch(value);
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

      let successMessage = wasEditing ? "Solicitacao reenviada." : "Solicitacao enviada.";
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
      const message = error instanceof Error ? error.message : "Erro ao salvar solicitacao.";
      showNotice("error", message);
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
    solicitacoes: filteredSolicitacoes,
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
    setSort,
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
