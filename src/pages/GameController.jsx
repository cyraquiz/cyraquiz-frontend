import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, X, Eye, Send, Trophy, Loader2, Star } from "lucide-react";
import { socket } from "../socket";
import { OPTION_BG, OPTION_SHADOW, OPTION_LETTER } from "../constants/game";
import "../styles/GameController.css";

export default function GameController() {
  const { pin }  = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const myName   = location.state?.name || localStorage.getItem("join_name") || "Jugador";

  const [gameState,       setGameState]       = useState("waiting");
  const [currentOptions,  setCurrentOptions]  = useState([]);
  const [questionType,    setQuestionType]    = useState("single");
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [textAnswer,      setTextAnswer]      = useState("");
  const [sliderValue,     setSliderValue]     = useState(50);
  const [questionMeta,    setQuestionMeta]    = useState({ min: 0, max: 100 });
  const [resultData,      setResultData]      = useState({ isCorrect: false, pointsEarned: 0, totalScore: 0 });
  const [finalRank,       setFinalRank]       = useState(0);
  const [podiumStep,      setPodiumStep]      = useState(0);

  // Reconnect
  useEffect(() => {
    const rejoin = () => socket.emit("join_room", { roomCode: pin, playerName: myName });
    socket.on("connect", rejoin);
    if (socket.connected) rejoin();
    return () => socket.off("connect", rejoin);
  }, [pin, myName]);

  // Game events
  useEffect(() => {
    const onNewQuestion = (q) => {
      const type = q?.type || "single";
      const hasOptions = Array.isArray(q?.options) && q.options.length > 0;
      const optionless = type === "text" || type === "slider";

      if (hasOptions || optionless) {
        const min = q.min ?? 0;
        const max = q.max ?? 100;
        setCurrentOptions(q.options || []);
        setQuestionType(type);
        setSelectedOptions([]);
        setTextAnswer("");
        setSliderValue(Math.round((min + max) / 2));
        setQuestionMeta({ min, max });
        setGameState("answering");
      } else {
        setGameState("waiting");
      }
    };

    const onAnswerResult  = (result) => setResultData(result);
    const onRevealResults = () => setGameState("result");

    const onFinalResults = (sortedList) => {
      const myIndex = sortedList.findIndex(p => p.name === myName);
      setFinalRank(myIndex + 1);
      if (myIndex !== -1) {
        setResultData(prev => ({ ...prev, myTime: sortedList[myIndex].timeAccumulated }));
      }
      const [p1, p2, p3] = sortedList;
      const isTripleTie = p1 && p2 && p3 && p1.score === p2.score && p2.score === p3.score && p1.score > 0;
      const isDoubleTie = p1 && p2 && p1.score === p2.score && p1.score > 0;
      setGameState("game_over");
      if (isTripleTie) {
        setTimeout(() => setPodiumStep(3), 8000);
      } else if (isDoubleTie) {
        setTimeout(() => setPodiumStep(1), 3000);
        setTimeout(() => setPodiumStep(3), 8000);
      } else {
        setTimeout(() => setPodiumStep(1), 3000);
        setTimeout(() => setPodiumStep(2), 6000);
        setTimeout(() => setPodiumStep(3), 10000);
      }
    };

    const onGameCancelled = () => navigate("/join");

    socket.on("new_question",   onNewQuestion);
    socket.on("answer_result",  onAnswerResult);
    socket.on("reveal_results", onRevealResults);
    socket.on("final_results",  onFinalResults);
    socket.on("game_cancelled", onGameCancelled);

    return () => {
      socket.off("new_question",   onNewQuestion);
      socket.off("answer_result",  onAnswerResult);
      socket.off("reveal_results", onRevealResults);
      socket.off("final_results",  onFinalResults);
      socket.off("game_cancelled", onGameCancelled);
    };
  }, [myName, navigate]);

  const handleOptionClick = (option) => {
    if (gameState !== "answering") return;
    if (questionType === "multi") {
      setSelectedOptions(prev =>
        prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
      );
    } else {
      submitToServer(option);
    }
  };

  const submitToServer = (answerData) => {
    setGameState("submitted");
    socket.emit("submit_answer", { roomCode: pin, playerName: myName, answer: answerData });
  };

  // ─── Answering ───────────────────────────────────────
  if (gameState === "answering") {

    // ── Respuesta escrita ──────────────────────────────
    if (questionType === "text") {
      return (
        <div className="gc-play">
          <div className="gc-info-bar">Escribe tu respuesta</div>
          <div className="gc-text-area">
            <input
              className="gc-text-input"
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && textAnswer.trim()) submitToServer(textAnswer.trim());
              }}
              placeholder="Escribe aquí..."
              maxLength={100}
              autoFocus
              autoComplete="off"
            />
            <motion.button
              className={`gc-submit${textAnswer.trim() ? " gc-submit--ready" : ""}`}
              onClick={() => textAnswer.trim() && submitToServer(textAnswer.trim())}
              disabled={!textAnswer.trim()}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Enviar respuesta"
            >
              <Send size={16} aria-hidden="true" />
              <span>Enviar respuesta</span>
            </motion.button>
          </div>
        </div>
      );
    }

    // ── Deslizador numérico ────────────────────────────
    if (questionType === "slider") {
      return (
        <div className="gc-play">
          <div className="gc-info-bar">Desliza hasta tu respuesta</div>
          <div className="gc-slider-area">
            <motion.div
              className="gc-slider-value"
              key={sliderValue}
              initial={{ scale: 0.85, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.1 }}
              aria-live="polite"
            >
              {sliderValue}
            </motion.div>
            <input
              className="gc-slider-input"
              type="range"
              min={questionMeta.min}
              max={questionMeta.max}
              value={sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              aria-label={`Valor: ${sliderValue}`}
            />
            <div className="gc-slider-labels">
              <span>{questionMeta.min}</span>
              <span>{questionMeta.max}</span>
            </div>
            <motion.button
              className="gc-submit gc-submit--ready"
              onClick={() => submitToServer(String(sliderValue))}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Confirmar valor"
            >
              <Send size={16} aria-hidden="true" />
              <span>Confirmar</span>
            </motion.button>
          </div>
        </div>
      );
    }

    // ── Escala 1–5 ────────────────────────────────────
    if (questionType === "scale") {
      return (
        <div className="gc-play">
          <div className="gc-info-bar">Selecciona tu valoración</div>
          <div className="gc-scale-grid" role="group" aria-label="Escala de valoración">
            {["1","2","3","4","5"].map((n) => (
              <button
                key={n}
                className="gc-scale-btn"
                onPointerDown={() => submitToServer(n)}
                aria-label={`Valoración ${n} de 5`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // ── Opciones (single | multi | tf | poll) ─────────
    if (!currentOptions.length) {
      return (
        <div className="gc-state gc-state--waiting">
          <div className="gc-bg" aria-hidden="true">
            <div className="gc-blob gc-blob-1" /><div className="gc-blob gc-blob-2" /><div className="gc-blob gc-blob-3" />
          </div>
          <Loader2 size={36} className="gc-spinner-icon" aria-hidden="true" />
          <p className="gc-state-title">Sincronizando...</p>
        </div>
      );
    }

    return (
      <div className="gc-play">
        {/* Instruction bar */}
        <div className="gc-info-bar">
          {questionType === "multi"
            ? "Selecciona dos opciones"
            : questionType === "poll"
            ? "Comparte tu opinión"
            : "Elige tu respuesta"}
        </div>

        {/* 2×2 button grid */}
        <div className="gc-grid" role="group" aria-label="Opciones de respuesta">
          {currentOptions.map((opt, i) => {
            const isSelected = selectedOptions.includes(opt);
            const isDimmed   = questionType === "multi" && selectedOptions.length > 0 && !isSelected;

            return (
              <button
                key={i}
                className={`gc-btn${isSelected ? " gc-btn--selected" : ""}${isDimmed ? " gc-btn--dimmed" : ""}`}
                style={{
                  background: OPTION_BG[i],
                  boxShadow:  `inset 0 -7px 0 ${OPTION_SHADOW[i]}`,
                }}
                onPointerDown={() => handleOptionClick(opt)}
                aria-label={`Opción ${OPTION_LETTER[i]}`}
                aria-pressed={isSelected}
              >
                <span className="gc-btn-letter">{OPTION_LETTER[i]}</span>
                {isSelected && (
                  <span className="gc-btn-check" aria-hidden="true">
                    <Check size={18} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Multi submit */}
        {questionType === "multi" && (
          <motion.button
            className={`gc-submit${selectedOptions.length > 0 ? " gc-submit--ready" : ""}`}
            onClick={() => selectedOptions.length > 0 && submitToServer(selectedOptions)}
            disabled={selectedOptions.length === 0}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0,  opacity: 1 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
            aria-label="Enviar selección"
          >
            <Send size={16} aria-hidden="true" />
            <span>Enviar respuesta</span>
          </motion.button>
        )}
      </div>
    );
  }

  // ─── Waiting (between questions) ─────────────────────
  if (gameState === "waiting") {
    return (
      <div className="gc-state gc-state--waiting" role="status" aria-live="polite">
        <div className="gc-bg" aria-hidden="true">
          <div className="gc-blob gc-blob-1" /><div className="gc-blob gc-blob-2" /><div className="gc-blob gc-blob-3" />
        </div>
        <motion.div
          className="gc-state-icon-wrap gc-state-icon-wrap--neutral"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        >
          <Eye size={32} />
        </motion.div>
        <motion.h2
          className="gc-state-title"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
        >
          ¡Atento a la pantalla!
        </motion.h2>
        <motion.p
          className="gc-state-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22, duration: 0.35 }}
        >
          La siguiente pregunta está por salir
        </motion.p>
        <motion.div
          className="gc-name-chip"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.32, duration: 0.35 }}
          aria-label={`Jugando como ${myName}`}
        >
          {myName}
        </motion.div>
      </div>
    );
  }

  // ─── Submitted ───────────────────────────────────────
  if (gameState === "submitted") {
    return (
      <div className="gc-state gc-state--waiting" role="status" aria-live="polite">
        <div className="gc-bg" aria-hidden="true">
          <div className="gc-blob gc-blob-1" /><div className="gc-blob gc-blob-2" /><div className="gc-blob gc-blob-3" />
        </div>
        <motion.div
          className="gc-state-icon-wrap gc-state-icon-wrap--primary"
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        >
          <Check size={34} strokeWidth={3} />
        </motion.div>
        <motion.h2
          className="gc-state-title"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.35 }}
        >
          ¡Respuesta enviada!
        </motion.h2>
        <motion.div
          className="gc-dots" aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
        >
          <span className="gc-dot" /><span className="gc-dot" /><span className="gc-dot" />
        </motion.div>
        <motion.p
          className="gc-state-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.35 }}
        >
          Esperando al resto...
        </motion.p>
      </div>
    );
  }

  // ─── Result ──────────────────────────────────────────
  if (gameState === "result") {
    // Encuesta / escala — pantalla neutra, sin correcto/incorrecto
    if (questionType === "poll" || questionType === "scale") {
      return (
        <div className="gc-state gc-state--waiting" role="status">
          <div className="gc-bg" aria-hidden="true">
            <div className="gc-blob gc-blob-1" /><div className="gc-blob gc-blob-2" /><div className="gc-blob gc-blob-3" />
          </div>
          <motion.div
            className="gc-state-icon-wrap gc-state-icon-wrap--primary"
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
          >
            <Check size={34} strokeWidth={3} />
          </motion.div>
          <motion.h1
            className="gc-state-title"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.36 }}
          >
            ¡Respuesta registrada!
          </motion.h1>
          <motion.p
            className="gc-total-score"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.32, duration: 0.36 }}
          >
            Total: <strong>{resultData.totalScore} pts</strong>
          </motion.p>
        </div>
      );
    }

    const isCorrect = resultData.isCorrect;
    return (
      <div className={`gc-state gc-state--result ${isCorrect ? "gc-state--correct" : "gc-state--incorrect"}`}>
        <motion.div
          className="gc-result-circle"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        >
          {isCorrect
            ? <Check size={44} strokeWidth={3} />
            : <X     size={44} strokeWidth={3} />
          }
        </motion.div>

        <motion.h1
          className="gc-result-title"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.36 }}
        >
          {isCorrect ? "¡Correcto!" : "¡Incorrecto!"}
        </motion.h1>

        <motion.div
          className="gc-points-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.36 }}
        >
          <span className="gc-points-label">Puntos ganados</span>
          <span className="gc-points-value">+{resultData.pointsEarned}</span>
        </motion.div>

        <motion.p
          className="gc-total-score"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.36 }}
        >
          Total: <strong>{resultData.totalScore} pts</strong>
        </motion.p>
      </div>
    );
  }

  // ─── Game over ───────────────────────────────────────
  if (gameState === "game_over") {
    const isWaiting =
      (finalRank === 1 && podiumStep < 3) ||
      (finalRank === 2 && podiumStep < 2) ||
      (finalRank >= 3 && podiumStep < 1);

    if (isWaiting) {
      return (
        <div className="gc-state gc-state--drumroll" role="status" aria-live="polite">
          <motion.div
            className="gc-state-icon-wrap gc-state-icon-wrap--light"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, ease: "linear", repeat: Infinity }}
            aria-hidden="true"
          >
            <Loader2 size={32} />
          </motion.div>
          <h2 className="gc-state-title gc-state-title--light">¡Calculando posiciones!</h2>
          <p className="gc-state-sub gc-state-sub--light">Mira la pantalla principal...</p>
        </div>
      );
    }

    const rankConfig = {
      1: { cls: "gc-state--gold",   icon: <Trophy size={48} />, label: "¡CAMPEÓN!" },
      2: { cls: "gc-state--silver", icon: <Star   size={48} />, label: "¡Subcampeón!" },
      3: { cls: "gc-state--bronze", icon: <Star   size={40} />, label: "¡Tercer lugar!" },
    };
    const cfg = rankConfig[finalRank] || {
      cls: "gc-state--other",
      icon: null,
      label: finalRank <= 10 ? "¡Top 10!" : "¡Buen trabajo!",
    };

    return (
      <div className={`gc-state gc-state--gameover ${cfg.cls}`}>
        {cfg.cls === "gc-state--other" && (
          <div className="gc-bg" aria-hidden="true">
            <div className="gc-blob gc-blob-1" /><div className="gc-blob gc-blob-2" /><div className="gc-blob gc-blob-3" />
          </div>
        )}

        {cfg.icon && (
          <motion.div
            className="gc-rank-icon"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
          >
            {cfg.icon}
          </motion.div>
        )}

        <motion.p className="gc-rank-label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          Quedaste en
        </motion.p>
        <motion.h1
          className="gc-rank-number"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          #{finalRank}
        </motion.h1>
        <motion.h2
          className="gc-rank-message"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.36 }}
        >
          {cfg.label}
        </motion.h2>

        <motion.div
          className="gc-final-stats"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.36 }}
        >
          <span>Puntaje final</span>
          <strong>{resultData.totalScore} pts</strong>
          {resultData.myTime > 0 && (
            <span className="gc-reaction-time">
              Tiempo de reacción promedio: {(resultData.myTime / 1000).toFixed(2)}s
            </span>
          )}
        </motion.div>

        <motion.button
          className="gc-btn-exit"
          onClick={() => navigate("/join")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.56 }}
          aria-label="Salir del juego"
        >
          Salir del juego
        </motion.button>
      </div>
    );
  }

  return null;
}
