import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Play, Users, X, ArrowLeft, Users2, Plus, Minus, Check, Music2, VolumeX } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { socket } from "../socket";
import { getAvatarSrc } from "../utils/avatars";
import useSound from "use-sound";
import "../styles/GameRoom.css";

function Spinner() {
  return <span className="gr-spinner" aria-hidden="true" />;
}

const MUSIC_PRESETS = [
  { id: "/question.mp3",    label: "Clásica",    icon: "🎵" },
  { id: "/lobby.mp3",       label: "Lobby",      icon: "🎶" },
  { id: "/music-arcade.mp3",label: "Arcade",     icon: "⚡" },
  { id: "/music-retro.mp3", label: "Retro",      icon: "🎸" },
  { id: "none",             label: "Sin música", icon: "🔇" },
];

const PRESET_TEAMS = [
  { id: 0, name: "Equipo Rojo",    color: "#c0392b" },
  { id: 1, name: "Equipo Azul",    color: "#2471a3" },
  { id: 2, name: "Equipo Verde",   color: "#1e8449" },
  { id: 3, name: "Equipo Naranja", color: "#d35400" },
  { id: 4, name: "Equipo Morado",  color: "#7d3c98" },
  { id: 5, name: "Equipo Marino",  color: "#1a5276" },
];

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

  // Music selector
  const [selectedMusic, setSelectedMusic] = useState("/question.mp3");

  // Team mode state
  const [teamPanelOpen,   setTeamPanelOpen]   = useState(false);
  const [teamCount,        setTeamCount]        = useState(2);
  const [teamNames,        setTeamNames]        = useState(PRESET_TEAMS.map(t => t.name));
  const [autoAssign,       setAutoAssign]       = useState(false);
  const [teamsConfirmed,   setTeamsConfirmed]   = useState(false);
  const [playerTeams,      setPlayerTeams]      = useState({}); // playerName -> {name, color}

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

    socket.on("team_updated", ({ teams }) => {
      const map = {};
      teams.forEach(t => t.players.forEach(name => { map[name] = { name: t.name, color: t.color }; }));
      setPlayerTeams(map);
    });

    return () => {
      socket.off("connect", createRoom);
      socket.off("room_created");
      socket.off("update_player_list");
      socket.off("player_joined");
      socket.off("team_updated");
    };
  }, []);

  const activeTeams = PRESET_TEAMS.slice(0, teamCount).map((t, i) => ({
    ...t,
    name: teamNames[i] || t.name,
  }));

  const handleConfirmTeams = () => {
    if (!roomCode || !hostTokenRef.current) return;
    socket.emit("enable_teams", {
      roomCode,
      hostToken: hostTokenRef.current,
      teams: activeTeams,
      autoAssign,
    });
    setTeamsConfirmed(true);
    setTeamPanelOpen(false);
  };

  const handleStartGame = () => {
    if (!roomCode || players.length === 0 || isStarting) return;
    setIsStarting(true);
    stopLobby();
    socket.emit("start_game", roomCode);
    navigate(`/host-game/${roomCode}`, {
      state: {
        quizData,
        players,
        hostToken: hostTokenRef.current,
        teamMode: teamsConfirmed,
        teams: teamsConfirmed ? activeTeams : undefined,
        questionMusic: selectedMusic,
      },
    });
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
          Escanea el QR o entra en <strong>cyraquiz.com/join</strong>:
        </p>

        {/* QR + PIN — side by side */}
        <div className="gr-entry">
          <div className="gr-qr" aria-label="Código QR para unirse">
            {roomCode ? (
              <QRCodeSVG
                value={`${window.location.origin}/join?pin=${roomCode}`}
                size={148}
                bgColor="transparent"
                fgColor="oklch(0.22 0.03 252)"
                level="M"
              />
            ) : (
              <div className="gr-qr-placeholder" aria-hidden="true" />
            )}
          </div>

          <div
            className={`gr-pin${!roomCode ? " gr-pin--loading" : ""}`}
            aria-label={roomCode ? `PIN de sala: ${formattedPin}` : "Generando PIN..."}
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="gr-pin-label">PIN</span>
            <span className="gr-pin-text">{formattedPin}</span>
          </div>
        </div>

        {/* Team setup panel */}
        <div className="gr-team-section">
          <div className="gr-team-bar">
            <span className="gr-team-bar-label">
              {teamsConfirmed
                ? <><Check size={14} style={{ color: "#1e8449" }} /> Modo equipos activo</>
                : "Modo equipos"}
            </span>
            <button
              className={`gr-team-toggle${teamsConfirmed ? " gr-team-toggle--active" : ""}`}
              onClick={() => setTeamPanelOpen(v => !v)}
              aria-expanded={teamPanelOpen}
            >
              <Users2 size={14} aria-hidden="true" />
              <span>{teamsConfirmed ? "Editar" : "Configurar"}</span>
            </button>
          </div>

          <AnimatePresence>
            {teamPanelOpen && (
              <motion.div
                className="gr-team-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div className="gr-team-panel-inner">
                  {/* Team count control */}
                  <div className="gr-team-count-row">
                    <span className="gr-team-count-label">Número de equipos</span>
                    <div className="gr-team-count-ctrl">
                      <button
                        className="gr-team-count-btn"
                        onClick={() => setTeamCount(v => Math.max(2, v - 1))}
                        aria-label="Reducir equipos"
                        disabled={teamCount <= 2}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="gr-team-count-val">{teamCount}</span>
                      <button
                        className="gr-team-count-btn"
                        onClick={() => setTeamCount(v => Math.min(6, v + 1))}
                        aria-label="Añadir equipo"
                        disabled={teamCount >= 6}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Team names */}
                  <div className="gr-team-list">
                    {PRESET_TEAMS.slice(0, teamCount).map((preset, i) => (
                      <div key={i} className="gr-team-item">
                        <span className="gr-team-dot" style={{ background: preset.color }} />
                        <input
                          type="text"
                          className="gr-team-name-input"
                          value={teamNames[i] ?? preset.name}
                          onChange={e => {
                            const updated = [...teamNames];
                            updated[i] = e.target.value;
                            setTeamNames(updated);
                          }}
                          maxLength={20}
                          placeholder={preset.name}
                          aria-label={`Nombre del equipo ${i + 1}`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Auto-assign toggle */}
                  <label className="gr-auto-assign">
                    <input
                      type="checkbox"
                      checked={autoAssign}
                      onChange={e => setAutoAssign(e.target.checked)}
                    />
                    <span className="gr-auto-assign-text">
                      Asignar jugadores automáticamente
                    </span>
                  </label>

                  {/* Confirm */}
                  <button
                    className="gr-team-confirm"
                    onClick={handleConfirmTeams}
                    disabled={!roomCode}
                  >
                    {teamsConfirmed ? "Actualizar equipos" : "Activar equipos"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Music selector */}
        <div className="gr-music-section" aria-label="Música durante preguntas">
          <div className="gr-music-bar">
            <Music2 size={14} className="gr-music-icon" aria-hidden="true" />
            <span className="gr-music-label">Música durante preguntas</span>
          </div>
          <div className="gr-music-presets" role="radiogroup" aria-label="Selecciona la música">
            {MUSIC_PRESETS.map(preset => (
              <button
                key={preset.id}
                role="radio"
                aria-checked={selectedMusic === preset.id}
                className={`gr-music-preset${selectedMusic === preset.id ? " gr-music-preset--active" : ""}`}
                onClick={() => setSelectedMusic(preset.id)}
              >
                <span className="gr-music-preset-icon" aria-hidden="true">{preset.icon}</span>
                <span className="gr-music-preset-label">{preset.label}</span>
              </button>
            ))}
          </div>
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
                {players.map((player) => {
                  const team = playerTeams[player.name];
                  return (
                    <motion.div
                      key={player.name}
                      className="gr-player"
                      style={team ? { borderColor: team.color + "55" } : {}}
                      variants={playerVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                    >
                      <div className="gr-player-avatar" aria-hidden="true">
                        <img src={getAvatarSrc(player.avatar || player.name)} alt="" />
                      </div>
                      <span className="gr-player-name">{player.name}</span>
                      {team && (
                        <span className="gr-player-team-badge" style={{ background: team.color }}>
                          {team.name}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      {/* ─ Bottom bar ────────────────────────────────── */}
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
