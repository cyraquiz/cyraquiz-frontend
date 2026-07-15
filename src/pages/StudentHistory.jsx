import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { resolveServerUrl } from "../utils/url";
import "../styles/StudentHistory.css";

const BASE = resolveServerUrl();

export default function StudentHistory() {
  const navigate    = useNavigate();
  const token       = localStorage.getItem("studentToken");
  const studentName = localStorage.getItem("studentName") || "Estudiante";

  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    if (!token) { navigate("/student-login"); return; }
    fetch(`${BASE}/student/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSessions(data);
        else setError("Error al cargar el historial.");
      })
      .catch(() => setError("Error de conexión."))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("studentName");
    navigate("/join");
  };

  const totalScore = sessions.reduce((s, sess) => s + (sess.score || 0), 0);
  const avgRank    = sessions.length
    ? Math.round(sessions.reduce((s, sess) => s + (sess.rank || 0), 0) / sessions.length)
    : null;
  const accuracy   = sessions.length
    ? Math.round(
        (sessions.reduce((s, sess) => s + (sess.correct_answers || 0), 0) /
         Math.max(sessions.reduce((s, sess) => s + (sess.total_questions || 0), 0), 1)) * 100
      )
    : null;

  return (
    <div className="sh-page">
      <div className="sh-bg" aria-hidden="true">
        <div className="sh-blob sh-blob-1" />
        <div className="sh-blob sh-blob-2" />
      </div>

      <div className="sh-inner">
        {/* Header */}
        <div className="sh-header">
          <button className="sh-back" onClick={() => navigate("/join")}>← Volver</button>
          <div className="sh-header-center">
            <h1 className="sh-title">Mi historial</h1>
            <p className="sh-sub">{studentName}</p>
          </div>
          <button className="sh-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>

        {/* Stats */}
        {sessions.length > 0 && (
          <div className="sh-stats">
            <div className="sh-stat">
              <strong>{sessions.length}</strong>
              <span>Partidas</span>
            </div>
            <div className="sh-stat">
              <strong>{totalScore.toLocaleString()}</strong>
              <span>Puntos totales</span>
            </div>
            {avgRank && (
              <div className="sh-stat">
                <strong>#{avgRank}</strong>
                <span>Pos. promedio</span>
              </div>
            )}
            {accuracy !== null && (
              <div className="sh-stat">
                <strong>{accuracy}%</strong>
                <span>Precisión</span>
              </div>
            )}
          </div>
        )}

        {/* Loading / error / empty */}
        {loading && <p className="sh-loading">Cargando historial…</p>}
        {error && <p className="sh-error">{error}</p>}
        {!loading && !error && sessions.length === 0 && (
          <div className="sh-empty">
            <p>Todavía no has jugado ninguna partida con tu cuenta.</p>
            <button className="sh-play-btn" onClick={() => navigate("/join")}>
              Jugar ahora
            </button>
          </div>
        )}

        {/* Session list */}
        {!loading && !error && sessions.length > 0 && (
          <div className="sh-list" role="list">
            {sessions.map((s, i) => (
              <motion.div
                key={s.id}
                className="sh-card"
                role="listitem"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <div className="sh-card-left">
                  <span
                    className={`sh-rank-badge${s.rank <= 3 ? ` sh-rank-badge--top${s.rank}` : ""}`}
                    aria-label={`Posición ${s.rank}`}
                  >
                    #{s.rank}
                  </span>
                  <div className="sh-card-meta">
                    <span className="sh-room">PIN {s.room_code || "—"}</span>
                    <span className="sh-date">
                      {new Date(s.played_at).toLocaleDateString("es-MX", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </span>
                  </div>
                </div>

                <div className="sh-card-right">
                  <strong className="sh-score">{(s.score || 0).toLocaleString()} pts</strong>
                  {s.total_questions > 0 && (
                    <span className="sh-accuracy">
                      {s.correct_answers}/{s.total_questions} correctas
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
