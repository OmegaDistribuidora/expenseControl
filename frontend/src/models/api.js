export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const parseApiError = (response, payload) => {
  const fallback = `${response.status} ${response.statusText}`.trim();
  if (!payload) return fallback;
  const details = payload.details && payload.details.length > 0 ? ` (${payload.details.join("; ")})` : "";
  return `${payload.message || payload.error || fallback}${details}`;
};

export const apiRequest = async (path, options = {}, basicOverride) => {
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }
  if (basicOverride) {
    headers.set("Authorization", `Basic ${basicOverride}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(parseApiError(response, payload));
  }

  return payload;
};
