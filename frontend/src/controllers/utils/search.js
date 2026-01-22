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
  const time = value ? Date.parse(value) : 0;
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
