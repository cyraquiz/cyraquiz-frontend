import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, User, Play, X, Check, AlertCircle, Edit2 } from "lucide-react";
import { socket } from "../socket";
import { AVATAR_SEEDS, getAvatarSrc } from "../utils/avatars";
import Footer from "../components/landing/Footer";
import "../styles/Join.css";

export default function Join() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState(
    searchParams.get("pin") || localStorage.getItem("join_roomCode") || ""
  );
  const [name, setName] = useState(localStorage.getItem("join_name") || "");
  const [error, setError] = useState("");
  const savedAvatar = localStorage.getItem("join_avatar");
  const [selectedAvatar, setSelectedAvatar] = useState((savedAvatar && AVATAR_SEEDS.includes(savedAvatar)) ? savedAvatar : AVATAR_SEEDS[0]);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const goToLobby = () => {
    localStorage.setItem("join_roomCode", pin.trim());
    localStorage.setItem("join_name", name.trim());
    localStorage.setItem("join_avatar", selectedAvatar);
    navigate(`/student/lobby/${pin.trim()}`, {
      state: { name: name.trim(), avatarSeed: selectedAvatar }
    });
  };

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onError = (msg) => {
      setError(msg);
      setTimeout(() => setError(""), 3000);
    };

    socket.on("error", onError);

    // Prefetch the StudentLobby chunk while the user fills the form
    import("./StudentLobby.jsx");

    return () => {
      socket.off("error", onError);
    };
  }, []);


  const handleJoin = () => {
    if (!pin || !name) {
      setError("Por favor llena ambos campos");
      return;
    }
    setError("");
    goToLobby();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <>
      <main className="join-page">
        {/* Background decoration */}
        <div className="join-background">
          <motion.div
            className="join-blob join-blob-1"
            animate={{ x: [0, 30, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="join-blob join-blob-2"
            animate={{ x: [0, -40, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="join-blob join-blob-3"
            animate={{ x: [0, 20, 0], y: [0, -20, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

      <motion.div
        className="join-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div className="join-logo-wrapper" variants={itemVariants}>
          <img src="/logo.svg" alt="CYRAQuiz" className="join-logo" />
        </motion.div>

        {/* Card */}
        <motion.div className="join-card" variants={itemVariants}>
          {/* Header */}
          <div className="join-header">
            <h1 className="join-title">Únete a la partida</h1>
            <p className="join-subtitle">
              Ingresa el código PIN y elige tu personaje
            </p>
          </div>

          {/* Avatar Selection */}
          <div className="join-avatar-section">
            <label className="join-label">Tu Avatar</label>
            <button
              className="join-avatar-preview"
              onClick={() => setShowAvatarModal(true)}
              aria-label="Cambiar avatar"
            >
              <div className="join-avatar-circle">
                <img
                  src={getAvatarSrc(selectedAvatar)}
                  alt="Avatar"
                  className="join-avatar-img"
                />
                <div className="join-avatar-edit-badge">
                  <Edit2 size={16} />
                </div>
              </div>
            </button>
          </div>

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                className="join-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <div className="join-form">
            {/* PIN Input */}
            <div className="join-form-group">
              <label className="join-label">
                <Hash size={18} />
                <span>Código PIN</span>
              </label>
              <input
                type="text"
                placeholder="Ingresa el código del juego"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="join-input join-input-pin"
                maxLength={6}
                autoComplete="off"
              />
            </div>

            {/* Name Input */}
            <div className="join-form-group">
              <label className="join-label">
                <User size={18} />
                <span>Tu Nombre</span>
              </label>
              <input
                type="text"
                placeholder="¿Cómo te llamas?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="join-input"
                maxLength={20}
                autoComplete="off"
              />
            </div>

            {/* Join Button */}
            <motion.button
              onClick={handleJoin}
              className="join-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play size={20} fill="currentColor" />
              <span>Unirme al juego</span>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      {showAvatarModal && (
        <>
          <div
            className="join-modal-backdrop"
            onClick={() => setShowAvatarModal(false)}
            aria-hidden="true"
          />
          <div
            className="join-modal-container"
            role="dialog"
            aria-modal="true"
            aria-label="Elige tu personaje"
          >
            <div className="join-modal">
              <button
                className="join-modal-close"
                onClick={() => setShowAvatarModal(false)}
                aria-label="Cerrar"
              >
                <X size={24} />
              </button>

              <div className="join-modal-header">
                <h2 className="join-modal-title">Elige tu personaje</h2>
                <p className="join-modal-subtitle">
                  Selecciona el avatar que te representará en el juego
                </p>
              </div>

              <div className="join-avatar-grid">
                {AVATAR_SEEDS.map((seed) => (
                  <button
                    key={seed}
                    onPointerDown={() => {
                      setSelectedAvatar(seed);
                      setShowAvatarModal(false);
                    }}
                    className={`join-avatar-option${selectedAvatar === seed ? " selected" : ""}`}
                    aria-label={`Avatar ${seed}`}
                    aria-pressed={selectedAvatar === seed}
                  >
                    <img src={getAvatarSrc(seed)} alt="Avatar" className="join-avatar-option-img" />
                    {selectedAvatar === seed && (
                      <div className="join-avatar-selected-badge">
                        <Check size={16} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}
