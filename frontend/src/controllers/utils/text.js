export const trimText = (value) => String(value || "").trim();

export const isBlank = (value) => trimText(value).length === 0;

export const exceedsLimit = (value, max) => trimText(value).length > max;

export const normalizeText = (value) => {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};
