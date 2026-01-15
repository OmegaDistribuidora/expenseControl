const STORAGE_KEY = "expense.auth";

export const loadStoredAuth = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.basic) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveStoredAuth = (auth) => {
  if (!auth) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
};