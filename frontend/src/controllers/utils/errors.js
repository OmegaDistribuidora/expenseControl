export const getErrorMessage = (error, fallback = "Erro inesperado.") => {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
};
