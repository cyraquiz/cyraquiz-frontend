import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Ghost, Play, Trash2, ArrowLeft, Check, X, Send, ChevronRight, Trophy } from "lucide-react";
import { loadGhostSaves, deleteGhostSave, addGhostAttempt, checkAnswer } from "../utils/ghostStorage";
import { OPTION_BG, OPTION_SHADOW, OPTION_LETTER } from "../constants/game";
import "../styles/GhostMode.css";

/* ── helpers ── */
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function totalPossible(questions) {
  return questions.reduce((s, q) => s + (q.points || 0), 0);
}

/* ══════════════════════════════════════════════════════
   VIEWS
══════════════════════════════════════════════════════ */

/* ── ListView ── */
function ListView({ saves, onPlay, onDelete, onBack }) {
  return (
    <div className="gm-page">
      <header className="gm-header">
        <button className="gm-btn-back" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={16} />
          <span>Volver</span>
        </button>
        <div className="gm-header-title">
          <Ghost size={20} />
          <span>Modo Fantasma</span>
        </div>
      </header>

      <main className="gm-list-main">
        {saves.length === 0 ? (
          <div className="gm-empty">
            <Ghost size={48} className="gm-empty-icon" />
            <p className="gm-empty-title">Sin quizzes guardados</p>
            <p className="gm-empty-sub">
              Participa en una partida en vivo y tu quiz se guardará automáticamente aquí para practicar solo.
            </p>
          </div>
        ) : (
          <>
            <p className="gm-list-hint">Tus quizzes guardados — practica sin conexión</p>
            <ul className="gm-saves-list">
              {saves.map(save => {
                const best = save.bestScore;
                const max  = totalPossible(save.questions);
                const pct  = max > 0 && best !== null ? Math.round((best / max) * 100) : null;
                return (
                  <li key={save.id} className="gm-save-card">
                    <div className="gm-save-info">
                      <p className="gm-save-title">{save.title}</p>
                      <p className="gm-save-meta">
                        {save.questionCount} preg. · {save.attempts.length} {save.attempts.length === 1 ? "intento" : "intentos"}
                        {pct !== null && <> · <strong>{pct}%</strong> récord</>}
                      </p>
                    </div>
                    <div className="gm-save-actions">
                      <button
                        className="gm-btn-delete"
                        onClick={() => onDelete(save.id)}
                        aria-label="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        className="gm-btn-play"
                        onClick={() => onPlay(save)}
                        aria-label="Practicar"
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Practicar</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

/* ── PlayView ── */
function PlayView({ save, onDone }) {
  const questions = save.questions;
  const [qIdx,          setQIdx]          = useState(0);
  const [timeLeft,      setTimeLeft]      = useState(questions[0]?.time || 20);
  const [answered,      setAnswered]      = useState(false);
  const [isCorrect,     setIsCorrect]     = useState(false);
  const [pointsEarned,  setPointsEarned]  = useState(0);
  const [score,         setScore]         = useState(0);
  const [selectedOpts,  setSelectedOpts]  = useState([]);
  const [textVal,       setTextVal]       = useState("");
  const [sliderVal,     setSliderVal]     = useState(50);
  const timerRef   = useRef(null);
  const scoreRef   = useRef(0);
  const ghostScore = save.bestScore;
  const q          = questions[qIdx];
  const maxTime    = q?.time || 20;

  const commit = useCallback((givenAnswer) => {
    if (answered) return;
    clearInterval(timerRef.current);
    const { isCorrect: ok, points } = checkAnswer(q, givenAnswer);
    scoreRef.current += points;
    setIsCorrect(ok);
    setPointsEarned(points);
    setScore(scoreRef.current);
    setAnswered(true);
  }, [answered, q]);

  // timer
  useEffect(() => {
    if (answered) return;
    setTimeLeft(maxTime);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          commit(q.type === "multi" ? [] : q.type === "slider" ? sliderVal : "");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx]);

  const next = () => {
    if (qIdx + 1 >= questions.length) {
      onDone(save.id, scoreRef.current, totalPossible(questions));
    } else {
      setQIdx(i => i + 1);
      setAnswered(false);
      setIsCorrect(false);
      setPointsEarned(0);
      setSelectedOpts([]);
      setTextVal("");
      const nextQ = questions[qIdx + 1];
      setSliderVal(Math.round(((nextQ?.min ?? 0) + (nextQ?.max ?? 100)) / 2));
    }
  };

  const handleOption = (opt) => {
    if (answered) return;
    if (q.type === "multi") {
      setSelectedOpts(prev =>
        prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
      );
    } else {
      commit(opt);
    }
  };

  const timerPct = (timeLeft / maxTime) * 100;

  return (
    <div className="gm-play">
      {/* Top bar */}
      <div className="gm-play-topbar">
        <span className="gm-play-progress">{qIdx + 1} / {questions.length}</span>
        {ghostScore !== null && (
          <span className="gm-ghost-badge">
            <Ghost size={13} />
            Récord: {ghostScore} pts
          </span>
        )}
        <span className="gm-play-score">{score} pts</span>
      </div>

      {/* Timer bar */}
      <div className="gm-timer-track" aria-hidden="true">
        <div
          className="gm-timer-fill"
          style={{ width: `${timerPct}%`, transition: answered ? "none" : "width 1s linear" }}
        />
      </div>

      {/* Question */}
      <div className="gm-question-wrap">
        <p className="gm-question-text">{q.question}</p>
      </div>

      {/* Answer area */}
      <div className="gm-answer-area">

        {/* Options (single / multi / tf / poll / scale) */}
        {(q.type === "single" || q.type === "tf" || q.type === "multi" || q.type === "poll" || q.type === "scale") && (
          <div className={`gm-options-grid gm-options-grid--${q.options.length <= 2 ? "2" : "4"}`}>
            {q.options.map((opt, i) => {
              const isSelected = selectedOpts.includes(opt) || false;
              let stateClass = "";
              if (answered) {
                const correctList = Array.isArray(q.answer) ? q.answer : [q.answer];
                if (correctList.includes(opt)) stateClass = " gm-opt--correct";
                else if (isSelected || (!Array.isArray(q.answer) && false)) stateClass = " gm-opt--wrong";
              }
              return (
                <button
                  key={opt}
                  className={`gm-opt-btn${stateClass}${isSelected ? " gm-opt--selected" : ""}`}
                  style={{ background: OPTION_BG[i], boxShadow: OPTION_SHADOW[i] }}
                  onClick={() => handleOption(opt)}
                  disabled={answered && q.type !== "multi"}
                >
                  <span className="gm-opt-letter">{OPTION_LETTER[i]}</span>
                  <span className="gm-opt-text">{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Multi confirm */}
        {q.type === "multi" && !answered && (
          <button
            className="gm-btn-confirm"
            onClick={() => commit(selectedOpts)}
            disabled={selectedOpts.length === 0}
          >
            <Send size={15} />
            <span>Confirmar selección</span>
          </button>
        )}

        {/* Text */}
        {q.type === "text" && !answered && (
          <div className="gm-text-wrap">
            <input
              className="gm-text-input"
              type="text"
              value={textVal}
              onChange={e => setTextVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && textVal.trim() && commit(textVal.trim().toLowerCase())}
              placeholder="Escribe tu respuesta..."
              autoFocus
            />
            <button
              className="gm-btn-confirm"
              onClick={() => commit(textVal.trim().toLowerCase())}
              disabled={!textVal.trim()}
            >
              <Send size={15} />
              <span>Enviar</span>
            </button>
          </div>
        )}

        {/* Slider */}
        {q.type === "slider" && !answered && (
          <div className="gm-slider-wrap">
            <span className="gm-slider-val">{sliderVal}</span>
            <input
              type="range"
              min={q.min ?? 0}
              max={q.max ?? 100}
              value={sliderVal}
              onChange={e => setSliderVal(Number(e.target.value))}
              className="gm-slider-input"
            />
            <div className="gm-slider-labels">
              <span>{q.min ?? 0}</span>
              <span>{q.max ?? 100}</span>
            </div>
            <button className="gm-btn-confirm" onClick={() => commit(String(sliderVal))}>
              <Send size={15} />
              <span>Confirmar</span>
            </button>
          </div>
        )}

        {/* Answer shown after answered */}
        {answered && (
          <div className={`gm-result-banner${isCorrect ? " gm-result-banner--ok" : " gm-result-banner--no"}`}>
            {isCorrect
              ? <><Check size={18} /> <span>+{pointsEarned} pts</span></>
              : <><X size={18} /> <span>Respuesta: {Array.isArray(q.answer) ? q.answer.join(", ") : q.answer}</span></>
            }
          </div>
        )}
      </div>

      {/* Next button */}
      {answered && (
        <div className="gm-next-wrap">
          <button className="gm-btn-next" onClick={next}>
            {qIdx + 1 >= questions.length ? "Ver resultados" : "Siguiente"}
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── ResultsView ── */
function ResultsView({ saveId, score, total, saves, onRetry, onBack }) {
  const save = saves.find(s => s.id === saveId);
  const pct  = total > 0 ? Math.round((score / total) * 100) : 0;
  const prev = save?.attempts?.slice(0, -1); // all but last (latest was just added)
  const bestPrev = prev?.length > 0 ? Math.max(...prev.map(a => a.score)) : null;
  const isNewRecord = bestPrev === null || score > bestPrev;

  return (
    <div className="gm-results">
      <div className="gm-results-card">
        <Trophy size={40} className="gm-results-trophy" />
        <h2 className="gm-results-score">{score} pts</h2>
        <p className="gm-results-pct">{pct}% correcto</p>

        {isNewRecord && bestPrev !== null && (
          <div className="gm-results-record">
            <Ghost size={16} />
            <span>¡Nuevo récord! Anterior: {bestPrev} pts</span>
          </div>
        )}
        {isNewRecord && bestPrev === null && (
          <div className="gm-results-record">
            <Ghost size={16} />
            <span>Primer intento guardado</span>
          </div>
        )}
        {!isNewRecord && (
          <div className="gm-results-ghost">
            <Ghost size={16} />
            <span>Récord: {bestPrev} pts — ¡Sigue intentando!</span>
          </div>
        )}

        <div className="gm-results-btns">
          <button className="gm-btn-retry" onClick={onRetry}>
            <Play size={14} fill="currentColor" />
            <span>Volver a intentarlo</span>
          </button>
          <button className="gm-btn-list" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Mis quizzes</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════ */
export default function GhostMode() {
  const navigate = useNavigate();
  const [view,      setView]      = useState("list");
  const [saves,     setSaves]     = useState(() => loadGhostSaves());
  const [active,    setActive]    = useState(null);   // current save being played
  const [lastScore, setLastScore] = useState(0);
  const [lastTotal, setLastTotal] = useState(0);

  const refreshSaves = () => setSaves(loadGhostSaves());

  const handlePlay = (save) => {
    setActive(save);
    setView("playing");
  };

  const handleDelete = (id) => {
    deleteGhostSave(id);
    refreshSaves();
  };

  const handleDone = (saveId, score, total) => {
    addGhostAttempt(saveId, score, total);
    refreshSaves();
    setLastScore(score);
    setLastTotal(total);
    setView("results");
  };

  const handleRetry = () => {
    // reload save from storage (attempts updated)
    const fresh = loadGhostSaves().find(s => s.id === active.id);
    setActive(fresh || active);
    setView("playing");
  };

  if (view === "playing" && active) {
    return <PlayView key={active.id + "-" + Date.now()} save={active} onDone={handleDone} />;
  }

  if (view === "results") {
    return (
      <ResultsView
        saveId={active.id}
        score={lastScore}
        total={lastTotal}
        saves={saves}
        onRetry={handleRetry}
        onBack={() => setView("list")}
      />
    );
  }

  return (
    <ListView
      saves={saves}
      onPlay={handlePlay}
      onDelete={handleDelete}
      onBack={() => navigate("/join")}
    />
  );
}
