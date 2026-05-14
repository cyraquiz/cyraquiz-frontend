import { motion } from "framer-motion";
import { Play, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Hero.css";

export default function Hero() {
  const { openRegister } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <section className="hero">
      <div className="hero-background">
        <motion.div
          className="blob blob-1"
          animate={{ x: [0, 30, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="blob blob-2"
          animate={{ x: [0, -40, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="blob blob-3"
          animate={{ x: [0, 20, 0], y: [0, -20, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="hero-container">
        <motion.div
          className="hero-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.p className="hero-eyebrow" variants={itemVariants}>
            Para docentes que evalúan diferente
          </motion.p>

          <motion.h1 className="hero-title" variants={itemVariants}>
            Transforma tus exámenes en{" "}
            <span className="hero-title-accent">experiencias interactivas</span>
          </motion.h1>

          <motion.p className="hero-subtitle" variants={itemVariants}>
            Evaluaciones gamificadas con IA. Resultados en tiempo real.
            Sin instalaciones, sin cuentas para tus estudiantes.
          </motion.p>

          <motion.div className="hero-ctas" variants={itemVariants}>
            <motion.button
              className="hero-btn hero-btn-primary"
              onClick={openRegister}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 40px oklch(0.26 0.14 14 / 0.28)",
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Play size={20} fill="currentColor" />
              Crear mi primer quiz
            </motion.button>

            <motion.button
              className="hero-btn hero-btn-secondary"
              onClick={() => {
                document.querySelector("#how-it-works")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              Ver cómo funciona
            </motion.button>
          </motion.div>

          <motion.div className="hero-trust" variants={itemVariants}>
            <div className="trust-item">
              <span className="trust-number">Gratis</span>
              <span className="trust-label">Sin tarjeta de crédito</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <span className="trust-number">IA</span>
              <span className="trust-label">Incluida sin costo</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <span className="trust-number">En vivo</span>
              <span className="trust-label">Sincronía total</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Mockup/Preview a la derecha */}
        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="hero-mockup">
            {/* Tarjeta de pregunta simulada - Mejorada */}
            <motion.div
              className="mockup-card mockup-question"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Header con progreso */}
              <div className="mockup-header">
                <div className="mockup-progress-section">
                  <div className="progress-info">
                    <span className="progress-label">Pregunta 3 de 10</span>
                    <div className="progress-bar-container">
                      <motion.div
                        className="progress-bar-fill"
                        initial={{ width: "0%" }}
                        animate={{ width: "30%" }}
                        transition={{ delay: 1.2, duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mockup-timer">
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" stroke="#E2E8F0" strokeWidth="2" fill="none" />
                    <motion.circle
                      cx="10"
                      cy="10"
                      r="8"
                      stroke="#5A0E24"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="50.265"
                      initial={{ strokeDashoffset: 0 }}
                      animate={{ strokeDashoffset: 25 }}
                      transition={{ delay: 1.5, duration: 3, ease: "linear" }}
                      style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                    />
                  </svg>
                  <span className="timer-text">15s</span>
                </div>
              </div>

              {/* Puntos disponibles */}
              <motion.div
                className="mockup-points-badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, duration: 0.5, type: "spring", stiffness: 200 }}
              >
                <Sparkles size={16} />
                <span>+100 pts</span>
              </motion.div>

              {/* Pregunta */}
              <motion.div
                className="mockup-question-text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.6 }}
              >
                ¿Cuál es la capital de Francia?
              </motion.div>

              {/* Opciones mejoradas */}
              <div className="mockup-options">
                {[
                  { text: "París", icon: "🦖", color: 1, correct: true },
                  { text: "Londres", icon: "⭐", color: 2 },
                  { text: "Berlín", icon: "🌸", color: 3 },
                  { text: "Madrid", icon: "🌈", color: 4 },
                ].map((option, i) => (
                  <motion.div
                    key={option.text}
                    className={`mockup-option option-${option.color}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.3 + i * 0.08, duration: 0.5, type: "spring", stiffness: 150 }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="option-icon">{option.icon}</span>
                    <span className="option-text">{option.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Indicador de jugadores respondiendo */}
              <motion.div
                className="mockup-players-indicator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8, duration: 0.6 }}
              >
                <div className="players-avatars">
                  {["🦖", "⭐", "🌸", "🌈", "👑"].map((emoji, i) => (
                    <motion.div
                      key={i}
                      className="mini-avatar"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 2 + i * 0.1, type: "spring", stiffness: 200 }}
                    >
                      {emoji}
                    </motion.div>
                  ))}
                </div>
                <span className="players-count">5 de 24 respondieron</span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Gradiente de transición al siguiente section */}
      <div className="hero-gradient-bottom" />
    </section>
  );
}
