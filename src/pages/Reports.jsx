import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Users, CheckCircle2, Clock, BarChart2 } from "lucide-react";
import { apiFetch } from "../utils/api";
import { getAvatarSrc } from "../utils/avatars";
import "../styles/Reports.css";

const EASE = [0.16, 1, 0.3, 1];

function pct(num, total) {
  if (!total) return 0;
  return Math.round((num / total) * 100);
}

function avgMs(playerAnswers) {
  if (!playerAnswers.length) return 0;
  const sum = playerAnswers.reduce((acc, a) => acc + (a.timeTaken || 0), 0);
  return Math.round(sum / playerAnswers.length);
}

function exportCSV(players, questions) {
  const header = ["Estudiante", "Puntaje Total", ...questions.map((q, i) => `P${i + 1} - Respuesta`), ...questions.map((q, i) => `P${i + 1} - Correcto`), ...questions.map((q, i) => `P${i + 1} - Tiempo (ms)`)];
  const rows = players.map(p => {
    const answers = questions.map(q => q.playerAnswers.find(a => a.name === p.name));
    return [
      p.name,
      p.score,
      ...answers.map(a => a ? (Array.isArray(a.answer) ? a.answer.join("|") : a.answer) : "—"),
      ...answers.map(a => a ? (a.isCorrect ? "Sí" : "No") : "—"),
      ...answers.map(a => a ? a.timeTaken : "—"),
    ];
  });
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte_cyraquiz.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(0);

  useEffect(() => {
    apiFetch(`/reports/${roomCode}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("No se pudo cargar el reporte."));
  }, [roomCode]);

  if (error) {
    return (
      <div className="rp-wrapper">
        <div className="rp-error">
          <p>{error}</p>
          <button className="rp-btn-back" onClick={() => navigate("/host")}>Volver al inicio</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rp-wrapper">
        <div className="rp-loading">Cargando reporte…</div>
      </div>
    );
  }

  const { players, questions } = data;
  const totalPlayers = players.length;

  // Summary stats
  const totalQuestions = questions.length;
  const overallCorrect = questions.reduce((acc, q) => acc + q.playerAnswers.filter(a => a.isCorrect).length, 0);
  const totalAnswers = questions.reduce((acc, q) => acc + q.playerAnswers.length, 0);
  const overallPct = pct(overallCorrect, totalAnswers);
  const hardestQ = questions.reduce((worst, q) => {
    const correctPct = pct(q.playerAnswers.filter(a => a.isCorrect).length, q.playerAnswers.length || 1);
    return correctPct < pct(worst.playerAnswers.filter(a => a.isCorrect).length, worst.playerAnswers.length || 1) ? q : worst;
  }, questions[0] || { playerAnswers: [], question: "—" });

  const currentQ = questions[activeQuestion];

  return (
    <div className="rp-wrapper">
      {/* Background blobs */}
      <div className="rp-bg" aria-hidden="true">
        <div className="rp-blob rp-blob-1" />
        <div className="rp-blob rp-blob-2" />
      </div>

      {/* Header */}
      <header className="rp-header">
        <button className="rp-btn-back" onClick={() => navigate(-1)} aria-label="Volver">
          <ArrowLeft size={18} strokeWidth={2.5} />
          <span>Volver</span>
        </button>
        <div className="rp-header-title">
          <h1>Análisis de partida</h1>
          <span className="rp-room-code">Sala {roomCode}</span>
        </div>
        <button
          className="rp-btn-download"
          onClick={() => exportCSV(players, questions)}
          aria-label="Descargar CSV"
        >
          <Download size={16} strokeWidth={2.5} />
          <span>Exportar CSV</span>
        </button>
      </header>

      <main className="rp-main">

        {/* Summary cards */}
        <motion.section
          className="rp-summary"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <div className="rp-card rp-card--stat">
            <div className="rp-card-icon"><Users size={22} /></div>
            <div className="rp-card-body">
              <span className="rp-card-number">{totalPlayers}</span>
              <span className="rp-card-label">Participantes</span>
            </div>
          </div>
          <div className="rp-card rp-card--stat">
            <div className="rp-card-icon"><BarChart2 size={22} /></div>
            <div className="rp-card-body">
              <span className="rp-card-number">{totalQuestions}</span>
              <span className="rp-card-label">Preguntas</span>
            </div>
          </div>
          <div className="rp-card rp-card--stat rp-card--accent">
            <div className="rp-card-icon"><CheckCircle2 size={22} /></div>
            <div className="rp-card-body">
              <span className="rp-card-number">{overallPct}%</span>
              <span className="rp-card-label">Aciertos globales</span>
            </div>
          </div>
          <div className="rp-card rp-card--stat">
            <div className="rp-card-icon"><Clock size={22} /></div>
            <div className="rp-card-body">
              <span className="rp-card-number">
                {totalAnswers ? (avgMs(questions.flatMap(q => q.playerAnswers)) / 1000).toFixed(1) + "s" : "—"}
              </span>
              <span className="rp-card-label">Tiempo medio</span>
            </div>
          </div>
        </motion.section>

        {/* Hardest question callout */}
        {hardestQ && totalQuestions > 1 && (
          <motion.div
            className="rp-hardest"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
          >
            <span className="rp-hardest-label">Pregunta más difícil</span>
            <p className="rp-hardest-text">{hardestQ.question}</p>
            <span className="rp-hardest-pct">
              {pct(hardestQ.playerAnswers.filter(a => a.isCorrect).length, hardestQ.playerAnswers.length || 1)}% de aciertos
            </span>
          </motion.div>
        )}

        <div className="rp-body">
          {/* Question list sidebar */}
          <motion.aside
            className="rp-sidebar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
          >
            <h2 className="rp-sidebar-heading">Preguntas</h2>
            <ol className="rp-q-list">
              {questions.map((q, i) => {
                const correctCount = q.playerAnswers.filter(a => a.isCorrect).length;
                const answered = q.playerAnswers.length;
                const qPct = pct(correctCount, answered || 1);
                return (
                  <li key={i}>
                    <button
                      className={`rp-q-item ${activeQuestion === i ? "rp-q-item--active" : ""}`}
                      onClick={() => setActiveQuestion(i)}
                    >
                      <span className="rp-q-num">{i + 1}</span>
                      <span className="rp-q-text">{q.question.length > 60 ? q.question.slice(0, 58) + "…" : q.question}</span>
                      <span className={`rp-q-pct ${qPct < 50 ? "rp-q-pct--low" : ""}`}>{qPct}%</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </motion.aside>

          {/* Question detail */}
          {currentQ && (
            <motion.section
              key={activeQuestion}
              className="rp-detail"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: EASE }}
            >
              <div className="rp-detail-header">
                <span className="rp-detail-num">Pregunta {activeQuestion + 1}</span>
                <span className="rp-detail-type">{currentQ.type}</span>
              </div>
              <h3 className="rp-detail-question">{currentQ.question}</h3>

              {/* Option bars */}
              {Array.isArray(currentQ.options) && currentQ.options.length > 0 && (
                <div className="rp-options">
                  {currentQ.options.map((opt, oi) => {
                    const count = currentQ.playerAnswers.filter(a =>
                      Array.isArray(a.answer) ? a.answer.includes(opt) : a.answer === opt
                    ).length;
                    const barPct = pct(count, totalPlayers);
                    const isCorrect = Array.isArray(currentQ.correctAnswer)
                      ? currentQ.correctAnswer.includes(opt)
                      : currentQ.correctAnswer === opt;
                    return (
                      <div key={oi} className={`rp-option-row ${isCorrect ? "rp-option-row--correct" : ""}`}>
                        <span className="rp-option-label">{opt}</span>
                        <div className="rp-option-bar-bg">
                          <motion.div
                            className="rp-option-bar-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.6, ease: EASE, delay: 0.1 * oi }}
                          />
                        </div>
                        <span className="rp-option-count">{count} ({barPct}%)</span>
                        {isCorrect && <CheckCircle2 size={16} className="rp-option-check" aria-label="Correcta" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Stats row */}
              <div className="rp-detail-stats">
                <div className="rp-detail-stat">
                  <span className="rp-detail-stat-val">
                    {pct(currentQ.playerAnswers.filter(a => a.isCorrect).length, currentQ.playerAnswers.length || 1)}%
                  </span>
                  <span className="rp-detail-stat-label">Aciertos</span>
                </div>
                <div className="rp-detail-stat">
                  <span className="rp-detail-stat-val">
                    {(avgMs(currentQ.playerAnswers) / 1000).toFixed(1)}s
                  </span>
                  <span className="rp-detail-stat-label">Tiempo medio</span>
                </div>
                <div className="rp-detail-stat">
                  <span className="rp-detail-stat-val">{currentQ.playerAnswers.length}</span>
                  <span className="rp-detail-stat-label">Respondieron</span>
                </div>
                <div className="rp-detail-stat">
                  <span className="rp-detail-stat-val">{currentQ.points}</span>
                  <span className="rp-detail-stat-label">Puntos</span>
                </div>
              </div>

              {/* Per-player answers */}
              <h4 className="rp-players-heading">Respuestas por estudiante</h4>
              <div className="rp-players-table">
                <div className="rp-players-thead">
                  <span>Estudiante</span>
                  <span>Respuesta</span>
                  <span>Tiempo</span>
                  <span>Puntos</span>
                </div>
                {players.map(p => {
                  const ans = currentQ.playerAnswers.find(a => a.name === p.name);
                  return (
                    <div key={p.name} className={`rp-players-row ${ans ? (ans.isCorrect ? "rp-players-row--correct" : "rp-players-row--wrong") : "rp-players-row--absent"}`}>
                      <span className="rp-players-name">
                        <img src={getAvatarSrc(p.avatar || p.name)} alt="" className="rp-mini-avatar" />
                        {p.name}
                      </span>
                      <span className="rp-players-answer">
                        {ans ? (Array.isArray(ans.answer) ? ans.answer.join(", ") : ans.answer) : "—"}
                      </span>
                      <span className="rp-players-time">{ans ? (ans.timeTaken / 1000).toFixed(2) + "s" : "—"}</span>
                      <span className="rp-players-points">{ans ? `+${ans.pointsEarned}` : "—"}</span>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}
        </div>

        {/* Leaderboard at bottom */}
        <motion.section
          className="rp-leaderboard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
        >
          <h2 className="rp-lb-heading">Clasificación final</h2>
          <ol className="rp-lb-list">
            {players.map((p, i) => (
              <li key={p.name} className="rp-lb-row">
                <span className="rp-lb-rank">{i + 1}</span>
                <img src={getAvatarSrc(p.avatar || p.name)} alt={p.name} className="rp-lb-avatar" />
                <span className="rp-lb-name">{p.name}</span>
                <span className="rp-lb-score">{p.score} pts</span>
                <span className="rp-lb-time">{(p.timeAccumulated / 1000).toFixed(2)}s</span>
                <div className="rp-lb-bar-bg">
                  <div
                    className="rp-lb-bar-fill"
                    style={{ width: `${pct(p.score, players[0]?.score || 1)}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </motion.section>

      </main>
    </div>
  );
}
