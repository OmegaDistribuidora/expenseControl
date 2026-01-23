import { LIMITS } from "../constants.js";
import { parseMoneyInput } from "./money.js";
import { exceedsLimit, isBlank, trimText } from "./text.js";

export const validateCategoryForm = (form) => {
  if (isBlank(form.nome)) {
    return "Informe o nome da categoria.";
  }
  if (exceedsLimit(form.nome, LIMITS.categoriaNome)) {
    return `Nome da categoria com no máximo ${LIMITS.categoriaNome} caracteres.`;
  }
  if (!isBlank(form.descricao) && exceedsLimit(form.descricao, LIMITS.categoriaDescricao)) {
    return `Descrição da categoria com no máximo ${LIMITS.categoriaDescricao} caracteres.`;
  }
  return null;
};

export const validateDecisionForm = (decisao, form) => {
  if (!isBlank(form.comentario) && exceedsLimit(form.comentario, LIMITS.decisaoComentario)) {
    return `Comentário com no máximo ${LIMITS.decisaoComentario} caracteres.`;
  }
  const valorRaw = trimText(form.valorAprovado);
  if (decisao === "APROVADO" && valorRaw) {
    const valor = parseMoneyInput(valorRaw);
    if (!valor || valor <= 0) {
      return "Informe um valor aprovado válido.";
    }
  }
  return null;
};

export const validatePedidoInfo = (comentario) => {
  if (isBlank(comentario)) {
    return "Informe o comentário para o pedido.";
  }
  if (exceedsLimit(comentario, LIMITS.pedidoInfoComentario)) {
    return `Comentário com no máximo ${LIMITS.pedidoInfoComentario} caracteres.`;
  }
  return null;
};
