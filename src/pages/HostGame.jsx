import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronRight, Check, AlertTriangle, Users,
} from "lucide-react";
import { socket } from "../socket";
import useSound from "use-sound";
import { OPTION_BG, OPTION_SHADOW, OPTION_LETTER } from "../constants/game";
import "../styles/HostGame.css";

export default function HostGame() {
  const { roomCode } = useParams();
  const location     = useLocation();
  const navigate     = useNavigate();

  const quizData      = location.state?.quizData;
  const players       = location.state?.players || [];
  const hostToken     = location.state?.hostToken;
  const questionsList = quizData?.questions || quizData?.questionsData || [];

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft,             setTimeLeft]             = useState(null);
  const [isShowingResult,      setIsShowingResult]      = useState(false);
  const [answersCount,         setAnswersCount]         = useState(0);
  const [startCountdown,       setStartCountdown]       = useState(3);
  const [showCancelModal,      setShowCancelModal]      = useState(false);
  const [stats,                setStats]                = useState([0, 0, 0, 0]);

  const [playCountdown,    { stop: stopCountdown    }] = useSound("/countdown.wav", { volume: 0.6 });
  const [playQuestionMusic,{ stop: stopQuestionMusic}] = useSound("/question.mp3",  { volume: 0.4, loop: true });
  const [playResultSound]                              = useSound("/result.mp3",    { volume: 0.7 });

  const nextLocked = useRef(false);

  const currentQ = questionsList[currentQuestionIndex];

  const handleExitGame = () => {
    socket.emit("cancel_game", { roomCode, hostToken });
    navigate("/host");
  };

  // ─── Countdown 3 → 0 → -1 ──────────────────────────
  useEffect(() => {
    if (startCountdown === 3) playCountdown();
    if (startCountdown >= 0) {
      const t = setTimeout(() => setStartCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    } else {
      stopCountdown();
    }
  }, [startCountdown, playCountdown, stopCountdown]);

  // ─── Question music ─────────────────────────────────
  useEffect(() => {
    if (startCountdown < 0 && !isShowingResult) {
      playQuestionMusic();
    } else {
      stopQuestionMusic();
    }
    return () => stopQuestionMusic();
  }, [startCountdown, isShowingResult, playQuestionMusic, stopQuestionMusic]);

  // ─── Auto-reveal when all players answered ──────────
  useEffect(() => {
    if (isShowingResult || players.length === 0) return;
    if (answersCount > 0 && answersCount >= players.length) {
      setTimeLeft(0);
      setIsShowingResult(true);
    }
  }, [answersCount, players.length, isShowingResult]);

  // ─── Emit show_results ──────────────────────────────
  useEffect(() => {
    if (isShowingResult) {
      socket.emit("show_results", { roomCode, hostToken });
      playResultSound();
    }
  }, [isShowingResult, roomCode, hostToken, playResultSound]);

  // ─── New question setup ─────────────────────────────
  useEffect(() => {
    if (startCountdown !== -1) return;
    const q = questionsList[currentQuestionIndex];
    if (!q) return;
    nextLocked.current = false;
    setIsShowingResult(false);
    setAnswersCount(0);
    setStats(Array.from({ length: (q.options || []).length }, () => 0));
    setTimeLeft(q.time || 20);
    socket.emit("send_question", {
      roomCode,
      question: q,
      time: q.time || 20,
      hostToken,
    });
    const onPlayerAnswered = () => setAnswersCount(prev => prev + 1);
    const onUpdateStats    = (s) => setStats(s);
    socket.on("player_answered", onPlayerAnswered);
    socket.on("update_stats",    onUpdateStats);
    return () => {
      socket.off("player_answered", onPlayerAnswered);
      socket.off("update_stats",    onUpdateStats);
    };
  }, [currentQuestionIndex, startCountdown, roomCode, questionsList]);

  // ─── Timer ──────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || isShowingResult) return;
    if (timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    } else {
      setIsShowingResult(true);
    }
  }, [timeLeft, isShowingResult]);

  const handleNext = () => {
    if (nextLocked.current) return;
    nextLocked.current = true;
    if (currentQuestionIndex < questionsList.length - 1) {
      setTimeLeft(null);
      setIsShowingResult(false);
      setAnswersCount(0);
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      navigate(`/podium/${roomCode}`, { state: { quizData, players, hostToken } });
    }
  };

  const formatTime = (s) => {
    if (s === null) return "···";
    if (s < 60) return s;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r < 10 ? "0" : ""}${r}`;
  };

  const timerMax = currentQ?.time || 20;
  const timerPct = timeLeft !== null ? (timeLeft / timerMax) * 100 : 100;

  const timerUrgency =
    timeLeft !== null && timeLeft <= 5  ? "critical" :
    timeLeft !== null && timeLeft <= 10 ? "warning"  : "normal";

  const isLastQuestion = currentQuestionIndex === questionsList.length - 1;

  if (!currentQ) {
    return <div className="hg-loading" role="status">Cargando pregunta…</div>;
  }

  // ─── Countdown screen ────────────────────────────────
  if (startCountdown >= 0) {
    return (
      <div className="hg-page" role="status" aria-live="polite">
        <div className="hg-bg" aria-hidden="true">
          <div className="hg-blob hg-blob-1" />
          <div className="hg-blob hg-blob-2" />
          <div className="hg-blob hg-blob-3" />
        </div>
        <div className="hg-countdown">
          <p className="hg-countdown-label">¿Listos?</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={startCountdown}
              className={`hg-countdown-num${startCountdown === 0 ? " hg-countdown-num--go" : ""}`}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              exit={{    scale: 1.7, opacity: 0 }}
              transition={{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
            >
              {startCountdown === 0 ? "¡VAMOS!" : startCountdown}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ─── Game screen ─────────────────────────────────────
  return (
    <div className="hg-page">

      {/* Background */}
      <div className="hg-bg" aria-hidden="true">
        <div className="hg-blob hg-blob-1" />
        <div className="hg-blob hg-blob-2" />
        <div className="hg-blob hg-blob-3" />
      </div>

      {/* ─ Nav ─────────────────────────────────────── */}
      <nav className="hg-nav" aria-label="Controles del juego">
        <div className="hg-nav-left">
          <button
            className="hg-btn-exit"
            onClick={() => setShowCancelModal(true)}
            aria-label="Salir del juego"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Salir</span>
          </button>
        </div>

        <div className="hg-nav-center">
          <div className="hg-nav-brand">
            <img src="/logo.svg" alt="CYRAQuiz" className="hg-nav-logo" />
            {quizData?.title && quizData.title !== "Modo Prueba" && (
              <>
                <span className="hg-nav-sep" aria-hidden="true">·</span>
                <span className="hg-nav-title" title={quizData.title}>
                  {quizData.title}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="hg-nav-right">
          <AnimatePresence>
            {isShowingResult && (
              <motion.button
                className="hg-btn-next"
                onClick={handleNext}
                initial={{ opacity: 0, x: 18, scale: 0.88 }}
                animate={{ opacity: 1, x: 0,  scale: 1    }}
                exit={{    opacity: 0, x: 12, scale: 0.92 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                aria-label={isLastQuestion ? "Ver podio final" : "Siguiente pregunta"}
              >
                <span>{isLastQuestion ? "Ver podio" : "Siguiente"}</span>
                <ChevronRight size={15} aria-hidden="true" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* ─ Timer bar ────────────────────────────────── */}
      <div className="hg-timer-track" aria-hidden="true">
        <div
          className={`hg-timer-fill${timerUrgency !== "normal" ? ` hg-timer-fill--${timerUrgency}` : ""}`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* ─ Main content ─────────────────────────────── */}
      <main className="hg-main" id="main-content">

        {/* Question card */}
        <div className={`hg-question-area${isShowingResult ? " hg-question-area--results" : ""}`}>
          <motion.div
            key={currentQuestionIndex}
            className="hg-question-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className={`hg-question-text${isShowingResult ? " hg-question-text--sm" : ""}`}>
              {currentQ.question}
            </h2>
          </motion.div>
        </div>

        {/* Bar chart — solo para tipos con opciones */}
        {currentQ.options && currentQ.options.length > 0 && (
          <div
            className={`hg-chart-area${isShowingResult ? " hg-chart-area--visible" : ""}`}
            aria-hidden={!isShowingResult}
          >
            <div className="hg-chart" role="img" aria-label="Distribución de respuestas">
              {currentQ.options.map((opt, i) => {
                const count     = stats[i] ?? 0;
                const maxVal    = Math.max(...currentQ.options.map((_, j) => stats[j] ?? 0), 1);
                const heightPct = (count / maxVal) * 100;
                const isPollType = currentQ.type === "poll" || currentQ.type === "scale";
                const isCorrect  = isPollType
                  ? true
                  : (Array.isArray(currentQ.answer)
                      ? currentQ.answer.includes(opt)
                      : currentQ.answer === opt);

                return (
                  <div key={i} className="hg-chart-col">
                    <div className="hg-chart-bar-wrap">
                      {count > 0 && (
                        <span className="hg-chart-count">{count}</span>
                      )}
                      <div
                        className="hg-chart-bar"
                        style={{
                          height:     count > 0 ? `${heightPct}%` : "10px",
                          background: OPTION_BG[i % OPTION_BG.length],
                          opacity:    !isCorrect ? 0.28 : 1,
                        }}
                      />
                    </div>
                    <div className="hg-chart-foot">
                      <span
                        className="hg-chart-letter"
                        style={{ background: OPTION_BG[i % OPTION_BG.length], opacity: !isCorrect ? 0.4 : 1 }}
                      >
                        {OPTION_LETTER[i] ?? i + 1}
                      </span>
                      {!isPollType && isCorrect && (
                        <span className="hg-chart-check" aria-label="Correcta">
                          <Check size={10} strokeWidth={3.5} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Options grid — solo para tipos con opciones */}
        {currentQ.options && currentQ.options.length > 0 && (
          <div
            className={`hg-options${isShowingResult ? " hg-options--results" : ""}`}
            role="list"
            aria-label="Opciones de respuesta"
          >
            {currentQ.options.map((opt, i) => {
              const isPollType = currentQ.type === "poll" || currentQ.type === "scale";
              const isCorrect  = isPollType
                ? false
                : (Array.isArray(currentQ.answer)
                    ? currentQ.answer.includes(opt)
                    : currentQ.answer === opt);
              const isFaded = isShowingResult && !isPollType && !isCorrect;

              return (
                <div
                  key={i}
                  role="listitem"
                  className={`hg-option${isFaded ? " hg-option--faded" : ""}`}
                  style={{
                    background: OPTION_BG[i % OPTION_BG.length],
                    boxShadow: `0 6px 0 ${OPTION_SHADOW[i % OPTION_SHADOW.length]}, 0 10px 24px rgba(0,0,0,0.16)`,
                  }}
                >
                  <span className="hg-option-letter" aria-hidden="true">
                    {OPTION_LETTER[i] ?? i + 1}
                  </span>
                  <span className="hg-option-text">{opt}</span>
                  {isShowingResult && !isPollType && isCorrect && (
                    <motion.span
                      className="hg-option-check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                      aria-label="Respuesta correcta"
                    >
                      <Check size={16} strokeWidth={3} aria-hidden="true" />
                    </motion.span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Reveal para text / slider — sin opciones */}
        {isShowingResult && (!currentQ.options || currentQ.options.length === 0) && (
          <motion.div
            className="hg-answer-reveal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="hg-answer-reveal-label">Respuesta esperada</p>
            <p className="hg-answer-reveal-value">{currentQ.answer}</p>
          </motion.div>
        )}

      </main>

      {/* ─ Bottom bar ───────────────────────────────── */}
      <div className="hg-bottom" role="toolbar" aria-label="Estado del juego">
        <div className="hg-bottom-inner">

          {/* Answers */}
          <div className="hg-bottom-stat" aria-label={`${answersCount} de ${players.length || "?"} respuestas`}>
            <div className="hg-bottom-stat-row">
              <Users size={14} className="hg-bottom-icon" aria-hidden="true" />
              <span className="hg-bottom-big" aria-live="polite">
                {answersCount}
                {players.length > 0 && <span className="hg-bottom-of">/{players.length}</span>}
              </span>
            </div>
            <span className="hg-bottom-label">Respuestas</span>
          </div>

          {/* Timer — center, large */}
          <div
            className={`hg-bottom-timer${timerUrgency !== "normal" ? ` hg-bottom-timer--${timerUrgency}` : ""}`}
            aria-live="off"
            aria-label={`${formatTime(timeLeft)} segundos`}
          >
            <span className="hg-bottom-timer-num">{formatTime(timeLeft)}</span>
            <span className="hg-bottom-label">
              {isShowingResult ? "Tiempo" : "Segundos"}
            </span>
          </div>

          {/* Progress + Points */}
          <div className="hg-bottom-right">
            <div className="hg-bottom-stat hg-bottom-stat--right" aria-label={`Pregunta ${currentQuestionIndex + 1} de ${questionsList.length}`}>
              <div className="hg-bottom-stat-row">
                <span className="hg-bottom-big">
                  {currentQuestionIndex + 1}
                  <span className="hg-bottom-of">/{questionsList.length}</span>
                </span>
              </div>
              <span className="hg-bottom-label">Pregunta</span>
            </div>
            <div className="hg-bottom-divider" aria-hidden="true" />
            <div className="hg-bottom-stat hg-bottom-stat--right" aria-label={`${currentQ.points || 100} puntos`}>
              <span className="hg-bottom-big">{currentQ.points || 100}</span>
              <span className="hg-bottom-label">Puntos</span>
            </div>
          </div>

        </div>
      </div>

      {/* ─ Cancel modal ─────────────────────────────── */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            className="hg-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setShowCancelModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hg-modal-title"
          >
            <motion.div
              className="hg-modal"
              initial={{ scale: 0.88, y: 24, opacity: 0 }}
              animate={{ scale: 1,    y: 0,  opacity: 1 }}
              exit={{    scale: 0.93, y: 12, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="hg-modal-icon" aria-hidden="true">
                <AlertTriangle size={22} />
              </div>
              <h2 className="hg-modal-title" id="hg-modal-title">
                ¿Cancelar el juego?
              </h2>
              <p className="hg-modal-text">
                Si sales ahora, la partida terminará para todos los jugadores.
              </p>
              <div className="hg-modal-actions">
                <button
                  className="hg-modal-btn hg-modal-btn--secondary"
                  onClick={() => setShowCancelModal(false)}
                >
                  Continuar jugando
                </button>
                <button
                  className="hg-modal-btn hg-modal-btn--danger"
                  onClick={handleExitGame}
                >
                  Sí, salir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
