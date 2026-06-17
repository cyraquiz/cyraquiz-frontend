import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, KeyRound } from "lucide-react";
import { apiFetch } from "../utils/api";
import "../components/auth/AuthModal.css";
import "./ResetPassword.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState("");
  const [isValidToken, setIsValidToken] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("access_token");
    const type = params.get("type");
    if (token && type === "recovery") {
      setAccessToken(token);
      setIsValidToken(true);
    } else {
      setIsValidToken(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiFetch("/auth/update-password", {
        method: "POST",
        body: JSON.stringify({ access_token: accessToken, new_password: password }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => navigate("/"), 3000);
      } else {
        setError(data.error || "Error al actualizar la contraseña");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="auth-modal reset-card">
        <div className="auth-modal-header">
          <div className="auth-logo">
            <img src="/logo.svg" alt="CYRAQuiz" />
          </div>

          {isValidToken === null && (
            <>
              <h2 className="auth-modal-title">Verificando enlace...</h2>
              <div className="reset-spinner-wrapper">
                <div className="auth-spinner reset-spinner" />
              </div>
            </>
          )}

          {isValidToken === false && (
            <>
              <h2 className="auth-modal-title">Enlace inválido</h2>
              <p className="auth-modal-subtitle">
                Este enlace de recuperación no es válido o ya expiró.
              </p>
              <motion.button
                className="auth-submit-button"
                style={{ marginTop: "1.5rem" }}
                onClick={() => navigate("/")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Volver al inicio
              </motion.button>
            </>
          )}

          {isValidToken === true && (
            <>
              <h2 className="auth-modal-title">
                {success ? "¡Listo!" : "Nueva contraseña"}
              </h2>
              <p className="auth-modal-subtitle">
                {success
                  ? "Tu contraseña fue actualizada. Redirigiendo..."
                  : "Elige una contraseña segura para tu cuenta"}
              </p>
            </>
          )}
        </div>

        {isValidToken === true && (
          <>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  className="auth-message auth-message-error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </motion.div>
              )}
              {success && (
                <motion.div
                  className="auth-message auth-message-success"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CheckCircle size={18} />
                  <span>Contraseña actualizada correctamente</span>
                </motion.div>
              )}
            </AnimatePresence>

            {!success && (
              <form onSubmit={handleSubmit}>
                <div className="auth-form-group">
                  <label className="auth-label">
                    <Lock size={18} />
                    <span>Nueva contraseña</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="auth-input"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="auth-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="auth-form-group">
                  <label className="auth-label">
                    <KeyRound size={18} />
                    <span>Confirmar contraseña</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <input
                      type={showConfirm ? "text" : "password"}
                      className="auth-input"
                      placeholder="Repite tu contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="auth-toggle-password"
                      onClick={() => setShowConfirm(!showConfirm)}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="auth-submit-button"
                  disabled={isLoading}
                  whileHover={!isLoading ? { scale: 1.02 } : {}}
                  whileTap={!isLoading ? { scale: 0.98 } : {}}
                >
                  {isLoading ? (
                    <span className="auth-loading">
                      <div className="auth-spinner" />
                      Actualizando...
                    </span>
                  ) : (
                    "Actualizar contraseña"
                  )}
                </motion.button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
