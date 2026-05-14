import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Play, Users, X, ArrowLeft } from "lucide-react";
import { socket } from "../socket";
import useSound from "use-sound";
import "../styles/GameRoom.css";

function Spinner() {
  return <span className="gr-spinner" aria-hidden="true" />;
}

export default function GameRoom() {
  const navigate = useNavigate();
  const location = useLocation();

  const quizData = location.state?.quizData || {
    title: "Modo Prueba",
    questionsData: [],
  };

  const [roomCode,    setRoomCode]    = useState(null);
  const [players,     setPlayers]     = useState([]);
  const [isStarting,  setIsStarting]  = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const hostTokenRef = useRef(null);

  const [playLobby, { stop: stopLobby }] = useSound("/lobby.mp3", {
    volume: 0.4,
    loop: true,
  });

  useEffect(() => {
    playLobby();
    return () => stopLobby();
  }, [playLobby, stopLobby]);

  useEffect(() => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomCode(code);

    const createRoom = () => socket.emit("create_room", code);

    if (socket.connected) {
      createRoom();
    } else {
      socket.once("connect", createRoom);
      socket.connect();
    }

    socket.on("room_created", ({ hostToken }) => {
      hostTokenRef.current = hostToken;
    });

    socket.on("update_player_list", (allPlayers) => {
      setPlayers(allPlayers);
    });

    socket.on("player_joined", (playerData) => {
      const safePlayer =
        typeof playerData === "string"
          ? { name: playerData, avatar: null }
          : playerData;
      setPlayers((prev) => {
        if (prev.find((p) => p.name === safePlayer.name)) return prev;
        return [...prev, safePlayer];
      });
    });

    return () => {
      socket.off("connect", createRoom);
      socket.off("room_created");
      socket.off("update_player_list");
      socket.off("player_joined");
    };
  }, []);

  const handleStartGame = () => {
    if (!roomCode || players.length === 0 || isStarting) return;
    setIsStarting(true);
    stopLobby();
    socket.emit("start_game", roomCode);
    navigate(`/host-game/${roomCode}`, { state: { quizData, players, hostToken: hostTokenRef.current } });
  };

  const handleExit = () => {
    stopLobby();
    navigate("/host");
  };

  const formattedPin = roomCode
    ? `${roomCode.slice(0, 2)}-${roomCode.slice(2, 4)}-${roomCode.slice(4, 6)}`
    : "··-··-··";

  const playerCount = players.length;
  const countLabel  = playerCount === 1 ? "jugador conectado" : "jugadores conectados";

  const playerVariants = {
    hidden:  { opacity: 0, scale: 0.7, y: 14 },
    visible: {
      opacity: 1, scale: 1, y: 0,
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
    },
    exit: {
      opacity: 0, scale: 0.85,
      transition: { duration: 0.16, ease: [0.7, 0, 0.84, 0] },
    },
  };

  return (
    <div className="gr-page">

      {/* ─ Background blobs ─────────────────────────── */}
      <div className="gr-bg" aria-hidden="true">
        <div className="gr-blob gr-blob-1" />
        <div className="gr-blob gr-blob-2" />
        <div className="gr-blob gr-blob-3" />
      </div>

      {/* ─ Nav ─────────────────────────────────────── */}
      <nav className="gr-nav" aria-label="Sala de juego">
        <div className="gr-nav-left">
          <button
            className="gr-nav-btn"
            onClick={() => setConfirmExit((c) => !c)}
            aria-expanded={confirmExit}
            aria-label="Volver a mis exámenes"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span className="gr-nav-btn-label">Mis exámenes</span>
          </button>
        </div>

        <div className="gr-nav-center">
          <div className="gr-nav-brand">
            <img src="/logo.svg" alt="CYRAQuiz" className="gr-nav-logo" />
            {quizData.title && quizData.title !== "Modo Prueba" && (
              <>
                <span className="gr-nav-sep" aria-hidden="true">·</span>
                <span className="gr-nav-quiz" title={quizData.title}>{quizData.title}</span>
              </>
            )}
          </div>
        </div>

        <div className="gr-nav-right">
          <button
            className="gr-nav-btn"
            onClick={() => setConfirmExit((c) => !c)}
            aria-label={confirmExit ? "Cancelar salida" : "Salir de la sala"}
          >
            {confirmExit
              ? <X size={15} aria-hidden="true" />
              : <LogOut size={15} aria-hidden="true" />}
            <span className="gr-nav-btn-label">
              {confirmExit ? "Cancelar" : "Salir"}
            </span>
          </button>
        </div>
      </nav>

      {/* ─ Exit confirmation ────────────────────────── */}
      <AnimatePresence>
        {confirmExit && (
          <motion.div
            className="gr-exit-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
            role="alert"
          >
            <div className="gr-exit-inner">
              <span className="gr-exit-text">
                ¿Salir? Los jugadores conectados serán desconectados.
              </span>
              <div className="gr-exit-actions">
                <button className="gr-exit-cancel" onClick={() => setConfirmExit(false)}>
                  Cancelar
                </button>
                <button className="gr-exit-confirm" onClick={handleExit}>
                  Salir
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─ Main ─────────────────────────────────────── */}
      <main className="gr-main" id="main-content">

        <p className="gr-join-hint">
          Entra en <strong>cyraquiz.com/join</strong> y escribe el PIN:
        </p>

        {/* PIN hero */}
        <div
          className={`gr-pin${!roomCode ? " gr-pin--loading" : ""}`}
          aria-label={roomCode ? `PIN de sala: ${formattedPin}` : "Generando PIN..."}
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="gr-pin-text">{formattedPin}</span>
        </div>

        {/* Players */}
        <section
          className="gr-players"
          aria-label={`${playerCount} ${countLabel}`}
          aria-live="polite"
          aria-atomic="false"
          aria-relevant="additions removals"
        >
          <div className="gr-players-header">
            <Users size={14} aria-hidden="true" />
            <span>
              {playerCount === 0 ? "Esperando jugadores" : `${playerCount} ${countLabel}`}
            </span>
          </div>

          {playerCount === 0 ? (
            <motion.p
              className="gr-players-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              Tus alumnos verán este PIN y podrán unirse desde su celular
            </motion.p>
          ) : (
            <div className="gr-players-grid">
              <AnimatePresence mode="popLayout">
                {players.map((player) => (
                  <motion.div
                    key={player.name}
                    className="gr-player"
                    variants={playerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <div className="gr-player-avatar" aria-hidden="true">
                      <img
                        src={
                          player.avatar ||
                          `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(player.name)}`
                        }
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(player.name)}`;
                        }}
                      />
                    </div>
                    <span className="gr-player-name">{player.name}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      {/* ─ Bottom bar (vino) ────────────────────────── */}
      <div className="gr-bottom" role="toolbar" aria-label="Controles de partida">
        <div className="gr-bottom-inner">

          <div className="gr-bottom-stat" aria-hidden="true">
            <span className="gr-stat-number">{playerCount}</span>
            <span className="gr-stat-label">
              {playerCount === 1 ? "jugador" : "jugadores"}
            </span>
          </div>

          <button
            className={`gr-btn-start${playerCount > 0 && !isStarting ? " gr-btn-start--ready" : ""}`}
            onClick={handleStartGame}
            disabled={playerCount === 0 || isStarting}
            aria-label={
              playerCount === 0
                ? "Esperando jugadores para poder iniciar"
                : "Iniciar el juego ahora"
            }
          >
            {isStarting ? (
              <><Spinner /><span>Iniciando...</span></>
            ) : (
              <><Play size={15} fill="currentColor" aria-hidden="true" /><span>Iniciar juego</span></>
            )}
          </button>

        </div>
      </div>

    </div>
  );
}
