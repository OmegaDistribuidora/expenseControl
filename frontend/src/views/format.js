export const statusLabels = {
  PENDENTE: "Pendente",
  PENDENTE_INFO: "Aguardando info",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
};

export const historicoAcoes = {
  CRIADA: "Solicitação criada",
  PEDIDO_INFO: "Pedido de ajuste",
  REENVIADA: "Solicitação reenviada",
  APROVADA: "Solicitação aprovada",
  REPROVADA: "Solicitação reprovada",
};

export const historicoAtores = {
  ADMIN: "Admin",
  FILIAL: "Filial",
};

export const formatCurrency = (value) => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const formatDateTime = (value) => {
  if (!value) return "-";
  const raw = String(value).trim();
  if (!raw) return "-";

  const hasTimezone = /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(raw);
  const isoWithoutTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(?:\.\d{1,9})?)?$/.test(raw);
  const normalized = isoWithoutTimezone && !hasTimezone ? `${raw}Z` : raw;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });
};

export const formatFileSize = (value) => {
  if (value === null || value === undefined) return "-";
  const size = Number(value);
  if (Number.isNaN(size)) return "-";
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const normalizeMoneyInput = (value) => {
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

export const formatMoneyInput = (value) => {
  const numeric = normalizeMoneyInput(value);
  if (numeric === null || Number.isNaN(numeric)) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

export const parseMoneyInput = (value) => normalizeMoneyInput(value);
