import { normalizeText } from "./text.js";

export const buildSearchText = (item) => {
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
  if (!value) return 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  const hasTimezone = /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(raw);
  const isoWithoutTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(?:\.\d{1,9})?)?$/.test(raw);
  const normalized = isoWithoutTimezone && !hasTimezone ? `${raw}Z` : raw;

  const time = Date.parse(normalized);
  return Number.isNaN(time) ? 0 : time;
};

export const sortSolicitacoes = (items, sortKey) => {
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
