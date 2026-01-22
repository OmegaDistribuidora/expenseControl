import { DEFAULT_PAGE_SIZE } from "../constants.js";

export const normalizePageResponse = (response) => {
  if (!response) {
    return { items: [], totalElements: 0, totalPages: 0, page: 0, size: DEFAULT_PAGE_SIZE };
  }
  if (Array.isArray(response)) {
    return { items: response, totalElements: response.length, totalPages: 1, page: 0, size: response.length };
  }
  const items = Array.isArray(response.items) ? response.items : [];
  return {
    items,
    totalElements: typeof response.totalElements === "number" ? response.totalElements : items.length,
    totalPages: typeof response.totalPages === "number" ? response.totalPages : items.length ? 1 : 0,
    page: typeof response.page === "number" ? response.page : 0,
    size: typeof response.size === "number" ? response.size : DEFAULT_PAGE_SIZE,
  };
};
