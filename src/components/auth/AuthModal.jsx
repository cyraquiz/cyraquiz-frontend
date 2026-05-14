import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";
import "./AuthModal.css";

export default function AuthModal() {
  const { isAuthModalOpen, authMode, closeAuthModal, switchToLogin, switchToRegister, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError("");
    setSuccessMsg("");
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    closeAuthModal();
  };

  const handleSwitchMode = (mode) => {
    resetForm();
    if (mode === 'login') switchToLogin();
    else switchToRegister();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token, data.user.email);
        handleClose();
        navigate("/host");
      } else {
        setError(data.error || "Credenciales incorrectas");
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

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
      const response = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg("¡Registro exitoso! Por favor revisa tu bandeja de entrada (y SPAM) para confirmar tu correo.");
        setTimeout(() => handleSwitchMode('login'), 3000);
      } else {
        setError(data.error || "Error al registrar usuario");
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <>
          <motion.div
            className="auth-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className="auth-modal-container"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="auth-modal">
              <button className="auth-modal-close" onClick={handleClose}>
                <X size={24} />
              </button>

              <div className="auth-modal-header">
                <div className="auth-logo">
                  <img src="/logo.svg" alt="CYRAQuiz" />
                </div>
                <h2 className="auth-modal-title">
                  {authMode === 'login' ? 'Bienvenido de nuevo' : 'Crear cuenta'}
                </h2>
                <p className="auth-modal-subtitle">
                  {authMode === 'login'
                    ? 'Ingresa tus credenciales para continuar'
                    : 'Únete y comienza a crear quizzes interactivos'}
                </p>
              </div>

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

                {successMsg && (
                  <motion.div
                    className="auth-message auth-message-success"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <CheckCircle size={18} />
                    <span>{successMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
                <div className="auth-form-group">
                  <label className="auth-label">
                    <Mail size={18} />
                    <span>Correo Electrónico</span>
                  </label>
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading || successMsg}
                  />
                </div>

                <div className="auth-form-group">
                  <label className="auth-label">
                    <Lock size={18} />
                    <span>Contraseña</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="auth-input"
                      placeholder={authMode === 'login' ? "••••••••" : "Mínimo 6 caracteres"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading || successMsg}
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

                {authMode === 'register' && (
                  <div className="auth-form-group">
                    <label className="auth-label">
                      <Lock size={18} />
                      <span>Confirmar Contraseña</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="auth-input"
                        placeholder="Repite tu contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading || successMsg}
                      />
                      <button
                        type="button"
                        className="auth-toggle-password"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                <motion.button
                  type="submit"
                  className="auth-submit-button"
                  disabled={isLoading || successMsg}
                  whileHover={!isLoading && !successMsg ? { scale: 1.02 } : {}}
                  whileTap={!isLoading && !successMsg ? { scale: 0.98 } : {}}
                >
                  {isLoading ? (
                    <span className="auth-loading">
                      <div className="auth-spinner" />
                      {authMode === 'login' ? 'Ingresando...' : 'Registrando...'}
                    </span>
                  ) : (
                    authMode === 'login' ? 'Ingresar' : 'Crear Cuenta'
                  )}
                </motion.button>
              </form>

              <div className="auth-modal-footer">
                <p className="auth-switch-text">
                  {authMode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                  {' '}
                  <button
                    type="button"
                    className="auth-switch-button"
                    onClick={() => handleSwitchMode(authMode === 'login' ? 'register' : 'login')}
                  >
                    {authMode === 'login' ? 'Regístrate' : 'Inicia sesión'}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
