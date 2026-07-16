import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { resolveServerUrl } from "../utils/url";
import "../styles/StudentAuth.css";

const BASE = resolveServerUrl();

export default function StudentAuth() {
  const navigate = useNavigate();
  const [tab, setTab]               = useState("login");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);

  const switchTab = (t) => { setTab(t); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    const path = tab === "login" ? "/auth/student-login" : "/auth/student-register";
    const body = tab === "login"
      ? { email, password }
      : { email, password, displayName };
    try {
      const res  = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error desconocido"); return; }
      localStorage.setItem("studentToken", data.token);
      localStorage.setItem("studentName", data.displayName);
      navigate("/join");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sa-page">
      <div className="sa-bg" aria-hidden="true">
        <div className="sa-blob sa-blob-1" />
        <div className="sa-blob sa-blob-2" />
        <div className="sa-blob sa-blob-3" />
      </div>

      <div className="sa-card">
        <img src="/logo.svg" alt="CYRAQuiz" className="sa-logo" />
        <h1 className="sa-heading">Cuenta de Estudiante</h1>

        <div className="sa-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "login"}
            className={`sa-tab${tab === "login" ? " sa-tab--active" : ""}`}
            onClick={() => switchTab("login")}
          >
            Iniciar sesión
          </button>
          <button
            role="tab"
            aria-selected={tab === "register"}
            className={`sa-tab${tab === "register" ? " sa-tab--active" : ""}`}
            onClick={() => switchTab("register")}
          >
            Crear cuenta
          </button>
        </div>

        <form className="sa-form" onSubmit={handleSubmit} noValidate>
          <AnimatePresence mode="wait" initial={false}>
            {tab === "register" && (
              <motion.div
                key="displayName"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                style={{ overflow: "hidden" }}
              >
                <input
                  className="sa-input"
                  type="text"
                  placeholder="Tu nombre (visible en el juego)"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                  maxLength={30}
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>

          <input
            className="sa-input"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus={tab === "login"}
            autoComplete="email"
          />
          <input
            className="sa-input"
            type="password"
            placeholder="Contraseña (mín. 6 caracteres)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={tab === "login" ? "current-password" : "new-password"}
          />

          <AnimatePresence>
            {error && (
              <motion.p
                className="sa-error"
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button className="sa-btn" type="submit" disabled={loading}>
            {loading ? "..." : tab === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <button className="sa-guest-link" onClick={() => navigate("/join")}>
          ← Jugar sin cuenta
        </button>
      </div>
    </div>
  );
}
