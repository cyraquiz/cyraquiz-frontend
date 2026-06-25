import { describe, it, expect, beforeEach, vi } from "vitest";

// resolveServerUrl uses window.location.hostname (set by happy-dom) and
// import.meta.env.VITE_API_URL. We control the latter via vi.stubEnv.

const PROD_URL = "https://cyraquiz-backend.onrender.com";

async function resolve(hostname) {
  vi.stubEnv("VITE_API_URL", PROD_URL);
  // Set window.location by assigning to window.location.href
  // happy-dom permits this assignment, updating hostname automatically
  window.location.href = `http://${hostname}/`;
  // Re-import to pick up fresh env/window (vitest resets modules when using vi.resetModules)
  vi.resetModules();
  const { resolveServerUrl } = await import("./url.js");
  return resolveServerUrl();
}

describe("resolveServerUrl", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("devuelve window.origin para localhost", async () => {
    const result = await resolve("localhost");
    expect(result).toBe("http://localhost");
  });

  it("devuelve window.origin para 192.168.x.x (LAN)", async () => {
    const result = await resolve("192.168.1.50");
    expect(result).toContain("192.168.1.50");
  });

  it("devuelve VITE_API_URL para dominio de producción", async () => {
    const result = await resolve("cyraquiz.com");
    expect(result).toBe(PROD_URL);
  });

  it("devuelve VITE_API_URL para subdominio de vercel", async () => {
    const result = await resolve("cyraquiz-frontend.vercel.app");
    expect(result).toBe(PROD_URL);
  });
});
