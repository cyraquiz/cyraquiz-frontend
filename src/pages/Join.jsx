import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, User, Play, X, Check, AlertCircle, Edit2 } from "lucide-react";
import { socket } from "../socket";
import Footer from "../components/landing/Footer";
import "../styles/Join.css";

const AVATARES = [
  "micky.png", "minnie.png", "pato.png", "goofy.png", "pluto.png",
  "bella.png", "cenicienta.png", "blanca.png", "durmiente.png",
  "mulan.png", "sirenita.png", "jasmine.png", "tiana.png", "merida.png",
  "rapunzel.png", "moana.png", "woody.png", "buzz.png", "marciano.png",
  "rayo.png", "mate.png", "nemo.png", "dory.png", "baymax.png", "sulley.png",
  "mike.png", "groot.png", "rocket.png", "spider.png", "iron.png",
  "hulk.png", "capitan.png", "viuda.png", "thor.png", "doctor.png",
  "wanda.png", "loki.png", "thanos.png", "harry.png", "hermione.png",
  "ron.png", "luna.png", "dum.png", "snape.png", "vold.png", "dobby.png",
  "hed.png", "buck.png",
];

export default function Join() {
  const navigate = useNavigate();
  const [pin, setPin] = useState(localStorage.getItem("join_roomCode") || "");
  const [name, setName] = useState(localStorage.getItem("join_name") || "");
  const [error, setError] = useState("");
  const savedAvatar = localStorage.getItem("join_avatar");
  const [selectedAvatar, setSelectedAvatar] = useState((savedAvatar && AVATARES.includes(savedAvatar)) ? savedAvatar : AVATARES[0]);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const goToLobby = () => {
    localStorage.setItem("join_roomCode", pin.trim());
    localStorage.setItem("join_name", name.trim());
    localStorage.setItem("join_avatar", selectedAvatar);
    navigate(`/student/lobby/${pin.trim()}`, {
      state: { name: name.trim(), avatar: `/avatars/${selectedAvatar}` }
    });
  };

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onError = (msg) => {
      setError(msg);
      setTimeout(() => setError(""), 3000);
    };

    const onPlayerJoined = (player) => {
      const joinedName = typeof player === "string" ? player : (player.name || player.playerName);

      if (joinedName === name || joinedName === name.trim()) {
        goToLobby();
      }
    };

    socket.on("error", onError);
    socket.on("player_joined", onPlayerJoined);

    return () => {
      socket.off("error", onError);
      socket.off("player_joined", onPlayerJoined);
    };
  }, [name, pin, selectedAvatar, navigate]);

  useEffect(() => {
    if (showAvatarModal) {
      setTimeout(() => {
        const elementoSeleccionado = document.getElementById(`avatar-${selectedAvatar}`);
        if (elementoSeleccionado) {
          elementoSeleccionado.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
    }
  }, [showAvatarModal, selectedAvatar]);

  const handleJoin = () => {
    if (!pin || !name) {
      setError("Por favor llena ambos campos");
      return;
    }
    setError("");

    if (!socket.connected) {
      console.log("⚠️ Socket desconectado. Intentando reconectar...");
      socket.connect();
    }

    socket.emit("join_room", {
      roomCode: pin.trim(),
      playerName: name.trim(),
      avatar: `/avatars/${selectedAvatar}`
    });

    setTimeout(() => {
      setError((currentError) => {
        if (!currentError) {
          console.log("Usando Plan B: Navegación forzada al lobby");
          goToLobby();
        }
        return currentError;
      });
    }, 500);
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
      <div className="join-page">
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
            <motion.div
              className="join-avatar-preview"
              onClick={() => setShowAvatarModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="join-avatar-circle">
                <img
                  src={`/avatars/${selectedAvatar}`}
                  alt="Avatar"
                  className="join-avatar-img"
                />
                <div className="join-avatar-edit-badge">
                  <Edit2 size={16} />
                </div>
              </div>
            </motion.div>
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

      {/* Avatar Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className="join-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAvatarModal(false)}
            />

            {/* Modal */}
            <motion.div
              className="join-modal-container"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="join-modal">
                {/* Close Button */}
                <button
                  className="join-modal-close"
                  onClick={() => setShowAvatarModal(false)}
                >
                  <X size={24} />
                </button>

                {/* Header */}
                <div className="join-modal-header">
                  <h2 className="join-modal-title">Elige tu personaje</h2>
                  <p className="join-modal-subtitle">
                    Selecciona el avatar que te representará en el juego
                  </p>
                </div>

                {/* Avatar Grid */}
                <div className="join-avatar-grid">
                  {AVATARES.map((img) => (
                    <motion.div
                      key={img}
                      id={`avatar-${img}`}
                      onClick={() => {
                        setSelectedAvatar(img);
                        setShowAvatarModal(false);
                      }}
                      className={`join-avatar-option ${selectedAvatar === img ? "selected" : ""}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <img
                        src={`/avatars/${img}`}
                        alt="avatar"
                        className="join-avatar-option-img"
                        loading="lazy"
                      />
                      {selectedAvatar === img && (
                        <motion.div
                          className="join-avatar-selected-badge"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Check size={16} strokeWidth={3} />
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>

      {/* Footer */}
      <Footer />
    </>
  );
}
