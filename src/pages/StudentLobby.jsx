import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "../socket";
import "../styles/StudentLobby.css";

export default function StudentLobby() {
  const { pin }    = useParams();
  const location   = useLocation();
  const navigate   = useNavigate();

  const myName   = location.state?.name       || localStorage.getItem("join_name")       || "Jugador";
  const myAvatar = location.state?.avatar     || localStorage.getItem("join_avatar_url");

  const [phase, setPhase] = useState("waiting"); // "waiting" | "starting"

  useEffect(() => {
    const joinRoom = () => {
      socket.emit("join_room", { roomCode: pin, playerName: myName, avatar: myAvatar });
    };

    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);

    const handleGameStart = () => {
      setPhase("starting");
      setTimeout(() => navigate(`/game/${pin}`, { state: { name: myName } }), 900);
    };

    const handleLateJoin = () => {
      navigate(`/game/${pin}`, { state: { name: myName } });
    };

    socket.on("game_started", handleGameStart);
    socket.on("new_question",  handleLateJoin);

    return () => {
      socket.off("connect",      joinRoom);
      socket.off("game_started", handleGameStart);
      socket.off("new_question", handleLateJoin);
    };
  }, [pin, navigate, myName, myAvatar]);

  const formattedPin = pin
    ? `${pin.slice(0, 2)}-${pin.slice(2, 4)}-${pin.slice(4, 6)}`
    : "";

  const initial  = (myName?.[0] || "?").toUpperCase();

  return (
    <div className={`sl-page${phase === "starting" ? " sl-page--starting" : ""}`}>

      {/* ─ Background blobs ─ */}
      <div className="sl-bg" aria-hidden="true">
        <div className="sl-blob sl-blob-1" />
        <div className="sl-blob sl-blob-2" />
        <div className="sl-blob sl-blob-3" />
      </div>

      {/* ─ Header ─ */}
      <header className="sl-header">
        <img src="/logo.svg" alt="CYRAQuiz" className="sl-logo" />
        {formattedPin && (
          <div className="sl-pin-badge" aria-label={`Sala PIN ${formattedPin}`}>
            <span className="sl-pin-label">PIN</span>
            <span className="sl-pin-value">{formattedPin}</span>
          </div>
        )}
      </header>

      {/* ─ Main content ─ */}
      <main className="sl-main" id="main-content">
        <AnimatePresence mode="wait">

          {phase === "waiting" && (
            <motion.div
              key="waiting"
              className="sl-content"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: -12 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Avatar */}
              <div className="sl-avatar-wrap" aria-hidden="true">
                <div className="sl-avatar-ring" />
                <div className="sl-avatar-ring sl-avatar-ring--outer" />
                <div className="sl-avatar">
                  {myAvatar ? (
                    <img src={myAvatar} alt={`Avatar de ${myName}`} />
                  ) : (
                    <span className="sl-avatar-initial">{initial}</span>
                  )}
                </div>
              </div>

              {/* Identity */}
              <motion.p
                className="sl-heading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                ¡Estás dentro!
              </motion.p>

              <motion.div
                className="sl-name-chip"
                aria-label={`Conectado como ${myName}`}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                {myName}
              </motion.div>

              {/* Status */}
              <motion.div
                className="sl-status"
                aria-live="polite"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32, duration: 0.4 }}
              >
                <div className="sl-dots" aria-hidden="true">
                  <span className="sl-dot" />
                  <span className="sl-dot" />
                  <span className="sl-dot" />
                </div>
                <p className="sl-status-text">Esperando al profesor</p>
              </motion.div>

              <motion.p
                className="sl-hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                Mira la pantalla del salón
              </motion.p>
            </motion.div>
          )}

          {phase === "starting" && (
            <motion.div
              key="starting"
              className="sl-starting"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              role="alert"
              aria-live="assertive"
            >
              <motion.div
                className="sl-start-icon"
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                aria-hidden="true"
              >
                🎮
              </motion.div>
              <p className="sl-start-heading">¡Comienza el juego!</p>
              <p className="sl-start-sub">Prepárate...</p>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
