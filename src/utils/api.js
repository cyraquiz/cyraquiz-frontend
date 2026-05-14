const BASE = import.meta.env.VITE_API_URL;

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
  return fetch(`${BASE}${path}`, { ...rest, headers });
}

export async function apiUpload(path, formData) {
  const token = getToken();
  const headers = token ? { token } : {};
  return fetch(`${BASE}${path}`, { method: "POST", headers, body: formData });
}
