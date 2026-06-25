export function resolveServerUrl() {
  if (typeof window === "undefined") return import.meta.env.VITE_API_URL;
  const h = window.location.hostname;
  const isLAN =
    h === "localhost" ||
    h === "127.0.0.1" ||
    /^192\.168\./.test(h) ||
    /^10\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h);
  return isLAN ? window.location.origin : import.meta.env.VITE_API_URL;
}
