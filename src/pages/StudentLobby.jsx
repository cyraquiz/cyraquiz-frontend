import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "../socket";
import { getAvatarSrc } from "../utils/avatars";
import "../styles/StudentLobby.css";

export default function StudentLobby() {
  const { pin }    = useParams();
  const location   = useLocation();
  const navigate   = useNavigate();

  const myName     = location.state?.name       || localStorage.getItem("join_name")  || "Jugador";
  const avatarSeed = location.state?.avatarSeed || localStorage.getItem("join_avatar");
  const myAvatar   = avatarSeed ? getAvatarSrc(avatarSeed) : null;

  // "waiting" | "team_select" | "team_confirmed" | "starting"
  const [phase,     setPhase]     = useState("waiting");
  const [teams,     setTeams]     = useState([]);
  const [myTeam,    setMyTeam]    = useState(null);
  const [autoAssign, setAutoAssign] = useState(false);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const joinRoom = () => {
      socket.emit("join_room", { roomCode: pin, playerName: myName, avatar: avatarSeed });
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

    const handleTeamsConfigured = ({ teams: t, autoAssign: auto }) => {
      setTeams(t);
      setAutoAssign(auto);
      if (!auto) {
        setPhase("team_select");
      }
    };

    const handleTeamUpdated = ({ teams: t }) => {
      setTeams(t);
      // Update myTeam if I'm in one
      const found = t.find(team => team.players.includes(myName));
      if (found) {
        setMyTeam(found);
        if (autoAssign) setPhase("team_confirmed");
      }
    };

    socket.on("game_started",      handleGameStart);
    socket.on("new_question",      handleLateJoin);
    socket.on("teams_configured",  handleTeamsConfigured);
    socket.on("team_updated",      handleTeamUpdated);

    return () => {
      socket.off("connect",         joinRoom);
      socket.off("game_started",    handleGameStart);
      socket.off("new_question",    handleLateJoin);
      socket.off("teams_configured", handleTeamsConfigured);
      socket.off("team_updated",    handleTeamUpdated);
    };
  }, [pin, navigate, myName, avatarSeed, autoAssign]);

  const handleJoinTeam = (team) => {
    socket.emit("join_team", { roomCode: pin, playerName: myName, teamId: team.id });
    setMyTeam(team);
    setPhase("team_confirmed");
  };

  const formattedPin = pin
    ? `${pin.slice(0, 2)}-${pin.slice(2, 4)}-${pin.slice(4, 6)}`
    : "";

  const initial = (myName?.[0] || "?").toUpperCase();

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

          {/* WAITING */}
          {phase === "waiting" && (
            <motion.div
              key="waiting"
              className="sl-content"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: -12 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
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

          {/* TEAM SELECT */}
          {phase === "team_select" && (
            <motion.div
              key="team_select"
              className="sl-content sl-content--teams"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: -12 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.p
                className="sl-heading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.3 }}
              >
                Elige tu equipo
              </motion.p>

              <div className="sl-team-grid">
                {teams.map((team, i) => (
                  <motion.button
                    key={team.id}
                    className="sl-team-btn"
                    style={{ "--team-color": team.color }}
                    onClick={() => handleJoinTeam(team)}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + i * 0.06, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="sl-team-color-bar" />
                    <span className="sl-team-name">{team.name}</span>
                    <span className="sl-team-count">
                      {team.players.length} {team.players.length === 1 ? "jugador" : "jugadores"}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* TEAM CONFIRMED */}
          {phase === "team_confirmed" && myTeam && (
            <motion.div
              key="team_confirmed"
              className="sl-content"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: -12 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="sl-team-badge"
                style={{ background: myTeam.color }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                aria-hidden="true"
              >
                {myTeam.name[0]}
              </motion.div>

              <motion.p className="sl-heading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                ¡Listo!
              </motion.p>
              <motion.div
                className="sl-name-chip"
                style={{ background: myTeam.color, color: "#fff" }}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.28 }}
              >
                {myTeam.name}
              </motion.div>

              <motion.div className="sl-status" aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }}>
                <div className="sl-dots" aria-hidden="true">
                  <span className="sl-dot" />
                  <span className="sl-dot" />
                  <span className="sl-dot" />
                </div>
                <p className="sl-status-text">Esperando al profesor</p>
              </motion.div>
            </motion.div>
          )}

          {/* STARTING */}
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
