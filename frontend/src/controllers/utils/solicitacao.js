import { LIMITS } from "../constants.js";
import { parseMoneyInput } from "./money.js";
import { exceedsLimit, isBlank, trimText } from "./text.js";

export const emptyDraft = () => ({
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

export const mapSolicitacaoToDraft = (solicitacao) => ({
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

export const buildSolicitacaoPayload = (draft) => ({
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

export const validateSolicitacaoDraft = (draft, reenvioComentario) => {
  if (!draft.categoriaId) {
    return "Selecione uma categoria.";
  }
  if (isBlank(draft.titulo)) {
    return "Informe o titulo.";
  }
  if (exceedsLimit(draft.titulo, LIMITS.titulo)) {
    return `Titulo com no maximo ${LIMITS.titulo} caracteres.`;
  }
  if (isBlank(draft.solicitanteNome)) {
    return "Informe o nome do solicitante.";
  }
  if (exceedsLimit(draft.solicitanteNome, LIMITS.solicitanteNome)) {
    return `Nome do solicitante com no maximo ${LIMITS.solicitanteNome} caracteres.`;
  }
  if (isBlank(draft.descricao)) {
    return "Informe a descricao.";
  }
  if (exceedsLimit(draft.descricao, LIMITS.descricao)) {
    return `Descricao com no maximo ${LIMITS.descricao} caracteres.`;
  }
  if (isBlank(draft.ondeVaiSerUsado)) {
    return "Informe onde vai ser usado.";
  }
  if (exceedsLimit(draft.ondeVaiSerUsado, LIMITS.ondeVaiSerUsado)) {
    return `Onde vai ser usado com no maximo ${LIMITS.ondeVaiSerUsado} caracteres.`;
  }
  const valorEstimado = parseMoneyInput(draft.valorEstimado);
  if (!valorEstimado || valorEstimado <= 0) {
    return "Informe um valor estimado valido.";
  }
  if (!isBlank(draft.fornecedor) && exceedsLimit(draft.fornecedor, LIMITS.fornecedor)) {
    return `Fornecedor com no maximo ${LIMITS.fornecedor} caracteres.`;
  }
  if (!isBlank(draft.formaPagamento) && exceedsLimit(draft.formaPagamento, LIMITS.formaPagamento)) {
    return `Forma de pagamento com no maximo ${LIMITS.formaPagamento} caracteres.`;
  }
  if (!isBlank(draft.observacoes) && exceedsLimit(draft.observacoes, LIMITS.observacoes)) {
    return `Observacoes com no maximo ${LIMITS.observacoes} caracteres.`;
  }
  if (!isBlank(reenvioComentario) && exceedsLimit(reenvioComentario, LIMITS.reenvioComentario)) {
    return `Comentario do reenvio com no maximo ${LIMITS.reenvioComentario} caracteres.`;
  }

  for (let index = 0; index < draft.linhas.length; index += 1) {
    const linha = draft.linhas[index];
    const descricao = trimText(linha.descricao);
    const valorRaw = trimText(linha.valor);
    const observacao = trimText(linha.observacao);
    if (!descricao && !valorRaw && !observacao) continue;
    const itemLabel = `item ${index + 1}`;
    if (!descricao) {
      return `Informe o nome do ${itemLabel}.`;
    }
    if (exceedsLimit(descricao, LIMITS.linhaDescricao)) {
      return `Nome do ${itemLabel} com no maximo ${LIMITS.linhaDescricao} caracteres.`;
    }
    if (!valorRaw) {
      return `Informe o valor do ${itemLabel}.`;
    }
    const valor = parseMoneyInput(linha.valor);
    if (!valor || valor <= 0) {
      return `Informe um valor valido para o ${itemLabel}.`;
    }
    if (observacao && exceedsLimit(observacao, LIMITS.linhaObservacao)) {
      return `Observacao do ${itemLabel} com no maximo ${LIMITS.linhaObservacao} caracteres.`;
    }
  }

  return null;
};
