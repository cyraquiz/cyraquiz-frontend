function resolveBase() {
  if (typeof window === 'undefined') return import.meta.env.VITE_API_URL;
  const h = window.location.hostname;
  const isLAN =
    h === 'localhost' || h === '127.0.0.1' ||
    /^192\.168\./.test(h) ||
    /^10\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h);
  return isLAN ? window.location.origin : import.meta.env.VITE_API_URL;
}

const BASE = resolveBase();

export function getToken() {
  return sessionStorage.getItem("token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const { headers: extraHeaders, ...rest } = options;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { token } : {}),
    ...extraHeaders,
  };
  const response = await fetch(`${BASE}${path}`, { ...rest, headers });
  if ((response.status === 401 || response.status === 403) && token) {
    window.dispatchEvent(new CustomEvent("auth:expired"));
  }
  return response;
}

export async function apiUpload(path, formData) {
  const token = getToken();
  const headers = token ? { token } : {};
  return fetch(`${BASE}${path}`, { method: "POST", headers, body: formData });
}
