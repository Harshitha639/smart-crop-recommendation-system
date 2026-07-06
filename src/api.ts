export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
