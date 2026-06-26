import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, X, Eye, Send, Trophy, Loader2, Star } from "lucide-react";
import { socket } from "../socket";
import { OPTION_BG, OPTION_SHADOW, OPTION_LETTER } from "../constants/game";
import { saveGhostGame } from "../utils/ghostStorage";
import { apiFetch } from "../utils/api";
import "../styles/GameController.css";

const REACTIONS = ["🔥", "❤️", "😮", "😂", "👏"];

export default function GameController() {
  const { pin }  = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const myName   = location.state?.name || localStorage.getItem("join_name") || "Jugador";

  const [gameState,       setGameState]       = useState("waiting");
  const [currentOptions,  setCurrentOptions]  = useState([]);
  const [questionType,    setQuestionType]    = useState("single");
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [lockedAnswer,    setLockedAnswer]    = useState(null); // immediate visual lock
  const [textAnswer,      setTextAnswer]      = useState("");
  const [sliderValue,     setSliderValue]     = useState(50);
  const [questionMeta,    setQuestionMeta]    = useState({ min: 0, max: 100 });
  const [resultData,      setResultData]      = useState({ isCorrect: false, pointsEarned: 0, totalScore: 0 });
  const [finalRank,       setFinalRank]       = useState(0);
  const [podiumStep,      setPodiumStep]      = useState(0);
  const [teamResults,     setTeamResults]     = useState(null); // team mode
  const [reviewData,      setReviewData]      = useState([]);
  const [showReview,      setShowReview]      = useState(false);
  const questionTimeRef  = useRef(20);
  const ghostCaptureRef  = useRef([]);
  const questionLogRef   = useRef([]);
  const hasAnsweredRef       = useRef(false); // synchronous guard against double-submit
  const pendingSubmitRef     = useRef(null);  // timeout handle — cancelled if reveal arrives first
  const hasGameOverRef       = useRef(false); // idempotent guard — server retries final_results
  const finalResultsHandlerRef = useRef(null); // HTTP polling fallback
  const lastReactionRef      = useRef(0);     // rate-limit: 1 reaction per 2 s

  // Reconnect
  useEffect(() => {
    const rejoin = () => socket.emit("join_room", { roomCode: pin, playerName: myName });
    socket.on("connect", rejoin);
    if (socket.connected) rejoin();
    return () => socket.off("connect", rejoin);
  }, [pin, myName]);

  // While in "result" state, poll the server every 1.5 s so that if
  // final_results was missed (timing/socket issue) we get it on rejoin.
  useEffect(() => {
    if (gameState !== "result") return;
    const id = setInterval(() => {
      socket.emit("join_room", { roomCode: pin, playerName: myName });
    }, 1500);
    return () => clearInterval(id);
  }, [gameState, pin, myName]);

  // HTTP polling fallback — completely independent of Socket.IO.
  // Polls /game-state/:pin every 2 s while in "result" state.
  // If game is over, calls onFinalResults directly.
  useEffect(() => {
    if (gameState !== "result") return;
    const id = setInterval(async () => {
      try {
        const res = await apiFetch(`/game-state/${pin}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "over" && Array.isArray(data.players) && finalResultsHandlerRef.current) {
          finalResultsHandlerRef.current(data.players);
          if (Array.isArray(data.teams)) setTeamResults(data.teams);
        }
      } catch { /* ignorar errores de red */ }
    }, 2000);
    return () => clearInterval(id);
  }, [gameState, pin]);

  // Game events
  useEffect(() => {
    const onNewQuestion = (q) => {
      if (pendingSubmitRef.current) {
        clearTimeout(pendingSubmitRef.current);
        pendingSubmitRef.current = null;
      }
      hasGameOverRef.current = false;
      const type = q?.type || "single";
      const hasOptions = Array.isArray(q?.options) && q.options.length > 0;
      const optionless = type === "text" || type === "slider";

      if (hasOptions || optionless) {
        ghostCaptureRef.current.push(q);
        questionLogRef.current.push({
          question: q.question || "",
          type: q.type || "single",
          options: q.options || [],
          answer: q.answer,
          image: q.image || null,
          myAnswer: null,
          isCorrect: false,
          pointsEarned: 0,
        });
        const min = q.min ?? 0;
        const max = q.max ?? 100;
        questionTimeRef.current = q.time || 20;
        hasAnsweredRef.current = false;
        setLockedAnswer(null);
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

    const onAnswerResult = (result) => {
      setResultData(result);
      const ll = questionLogRef.current;
      if (ll.length > 0) {
        ll[ll.length - 1].isCorrect   = result.isCorrect   ?? false;
        ll[ll.length - 1].pointsEarned = result.pointsEarned ?? 0;
      }
    };
    const onRevealResults = () => {
      if (hasGameOverRef.current) return;
      if (pendingSubmitRef.current) {
        clearTimeout(pendingSubmitRef.current);
        pendingSubmitRef.current = null;
      }
      setGameState("result");
    };

    const onFinalResults = (sortedList) => {
      if (hasGameOverRef.current) return;
      hasGameOverRef.current = true;
      if (pendingSubmitRef.current) {
        clearTimeout(pendingSubmitRef.current);
        pendingSubmitRef.current = null;
      }
      try { saveGhostGame(ghostCaptureRef.current); } catch { /* no-op en contextos HTTP */ }
      const myIndex = sortedList.findIndex(p => p.name === myName);
      setFinalRank(myIndex + 1);
      if (myIndex !== -1) {
        setResultData(prev => ({ ...prev, myTime: sortedList[myIndex].timeAccumulated }));
      }

      const [p1, p2, p3] = sortedList;
      const isTripleTie = p1 && p2 && p3 && p1.score === p2.score && p2.score === p3.score && p1.score > 0;
      const isDoubleTie = p1 && p2 && p1.score === p2.score && p1.score > 0;
      setGameState("game_over");
      setReviewData([...questionLogRef.current]);
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

    finalResultsHandlerRef.current = onFinalResults;

    const onGameCancelled = () => navigate("/join");

    const onTeamResults = (teams) => setTeamResults(teams);

    socket.on("new_question",   onNewQuestion);
    socket.on("answer_result",  onAnswerResult);
    socket.on("reveal_results", onRevealResults);
    socket.on("final_results",  onFinalResults);
    socket.on("team_results",   onTeamResults);
    socket.on("game_cancelled", onGameCancelled);

    return () => {
      socket.off("new_question",   onNewQuestion);
      socket.off("answer_result",  onAnswerResult);
      socket.off("reveal_results", onRevealResults);
      socket.off("final_results",  onFinalResults);
      socket.off("team_results",   onTeamResults);
      socket.off("game_cancelled", onGameCancelled);
    };
  }, [myName, navigate]);

  const handleOptionClick = (option) => {
    if (gameState !== "answering" || hasAnsweredRef.current) return;
    if (questionType === "multi") {
      setSelectedOptions(prev =>
        prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
      );
    } else {
      hasAnsweredRef.current = true;
      setLockedAnswer(option);
      const llc = questionLogRef.current;
      if (llc.length > 0) llc[llc.length - 1].myAnswer = option;
      socket.emit("submit_answer", { roomCode: pin, playerName: myName, answer: option });
      pendingSubmitRef.current = setTimeout(() => {
        pendingSubmitRef.current = null;
        setGameState("submitted");
      }, 50);
    }
  };

  const submitToServer = (answerData) => {
    if (hasAnsweredRef.current) return;
    hasAnsweredRef.current = true;
    setLockedAnswer(String(answerData));
    const lls = questionLogRef.current;
    if (lls.length > 0) lls[lls.length - 1].myAnswer = answerData;
    socket.emit("submit_answer", { roomCode: pin, playerName: myName, answer: answerData });
    pendingSubmitRef.current = setTimeout(() => {
      pendingSubmitRef.current = null;
      setGameState("submitted");
    }, 50);
  };

  const handleReaction = (emoji) => {
    const now = Date.now();
    if (now - lastReactionRef.current < 2000) return;
    lastReactionRef.current = now;
    socket.emit("send_reaction", { roomCode: pin, emoji });
  };

  // ─── Reaction bar portal (mounts to body, visible during active game) ──
  const isActiveGame = (gameState === "waiting" || gameState === "answering" || gameState === "submitted" || gameState === "result") && !showReview;
  const reactionPortal = isActiveGame
    ? createPortal(
        <div className="gc-reactions" aria-label="Reacciones en vivo">
          {REACTIONS.map(emoji => (
            <button
              key={emoji}
              className="gc-reaction-btn"
              onClick={() => handleReaction(emoji)}
              aria-label={`Reacción ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  // ─── Answering ───────────────────────────────────────
  if (gameState === "answering") {

    // ── Respuesta escrita ──────────────────────────────
    if (questionType === "text") {
      return (
        <>
          <div className="gc-play">
            <div className="gc-info-bar">Escribe tu respuesta</div>
            <div className="gc-timer-track" aria-hidden="true"><div className="gc-timer-fill" style={{ animationDuration: `${questionTimeRef.current}s` }} /></div>
            <div className="gc-text-area">
              <input
                className="gc-text-input"
                type="text"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && textAnswer.trim()) submitToServer(textAnswer.trim().toLowerCase());
                }}
                placeholder="Escribe aquí..."
                maxLength={100}
                autoFocus
                autoComplete="off"
              />
              <motion.button
                className={`gc-submit${textAnswer.trim() ? " gc-submit--ready" : ""}`}
                onClick={() => textAnswer.trim() && submitToServer(textAnswer.trim().toLowerCase())}
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
          {reactionPortal}
        </>
      );
    }

    // ── Deslizador numérico ────────────────────────────
    if (questionType === "slider") {
      return (
        <>
          <div className="gc-play">
            <div className="gc-info-bar">Desliza hasta tu respuesta</div>
            <div className="gc-timer-track" aria-hidden="true"><div className="gc-timer-fill" style={{ animationDuration: `${questionTimeRef.current}s` }} /></div>
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
          {reactionPortal}
        </>
      );
    }

    // ── Escala 1–5 ────────────────────────────────────
    if (questionType === "scale") {
      return (
        <>
          <div className="gc-play">
            <div className="gc-info-bar">Selecciona tu valoración</div>
            <div className="gc-timer-track" aria-hidden="true"><div className="gc-timer-fill" style={{ animationDuration: `${questionTimeRef.current}s` }} /></div>
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
          {reactionPortal}
        </>
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
      <>
      <div className="gc-play">
        {/* Instruction bar */}
        <div className="gc-info-bar">
          {questionType === "multi"
            ? "Selecciona dos opciones"
            : questionType === "poll"
            ? "Comparte tu opinión"
            : "Elige tu respuesta"}
        </div>

        <div className="gc-timer-track" aria-hidden="true"><div className="gc-timer-fill" style={{ animationDuration: `${questionTimeRef.current}s` }} /></div>

        {/* 2×2 button grid */}
        <div className="gc-grid" role="group" aria-label="Opciones de respuesta">
          {currentOptions.map((opt, i) => {
            const isSelected = selectedOptions.includes(opt);
            const isDimmed   = questionType === "multi" && selectedOptions.length > 0 && !isSelected;
            const isChosen   = lockedAnswer === opt;
            const isLocked   = !!lockedAnswer;

            return (
              <button
                key={i}
                className={`gc-btn${isSelected ? " gc-btn--selected" : ""}${isDimmed ? " gc-btn--dimmed" : ""}${isLocked ? (isChosen ? " gc-btn--locked-chosen" : " gc-btn--locked") : ""}`}
                style={{
                  background: OPTION_BG[i],
                  boxShadow:  `inset 0 -7px 0 ${OPTION_SHADOW[i]}`,
                }}
                onPointerDown={() => handleOptionClick(opt)}
                aria-label={`Opción ${OPTION_LETTER[i]}`}
                aria-pressed={isSelected || isChosen}
                disabled={isLocked}
              >
                <span className="gc-btn-letter">{OPTION_LETTER[i]}</span>
                {(isSelected || isChosen) && (
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
      {reactionPortal}
    </>
    );
  }

  // ─── Waiting (between questions) ─────────────────────
  if (gameState === "waiting") {
    return (
      <>
        <div className="gc-state gc-state--waiting" role="status" aria-live="polite">
          <div className="gc-bg" aria-hidden="true">
            <div className="gc-blob gc-blob-1" /><div className="gc-blob gc-blob-2" /><div className="gc-blob gc-blob-3" />
          </div>
          <div className="gc-state-icon-wrap gc-state-icon-wrap--neutral gc-waiting-icon" aria-hidden="true">
            <Eye size={32} />
          </div>
          <h2 className="gc-state-title gc-waiting-title">
            ¡Atento a la pantalla!
          </h2>
          <p className="gc-state-sub gc-waiting-sub">
            La siguiente pregunta está por salir
          </p>
          <div className="gc-name-chip gc-waiting-chip" aria-label={`Jugando como ${myName}`}>
            {myName}
          </div>
        </div>
        {reactionPortal}
      </>
    );
  }

  // ─── Submitted ───────────────────────────────────────
  if (gameState === "submitted") {
    return (
      <>
        <div className="gc-state gc-state--waiting" role="status" aria-live="polite">
          <div className="gc-bg" aria-hidden="true">
            <div className="gc-blob gc-blob-1" /><div className="gc-blob gc-blob-2" /><div className="gc-blob gc-blob-3" />
          </div>
          <div className="gc-state-icon-wrap gc-state-icon-wrap--primary gc-anim-pop" aria-hidden="true">
            <Check size={34} strokeWidth={3} />
          </div>
          <h2 className="gc-state-title gc-anim-fade-up">¡Respuesta enviada!</h2>
          <div className="gc-dots gc-anim-fade" aria-hidden="true">
            <span className="gc-dot" /><span className="gc-dot" /><span className="gc-dot" />
          </div>
          <p className="gc-state-sub gc-anim-fade">Esperando al resto...</p>
        </div>
        {reactionPortal}
      </>
    );
  }

  // ─── Result ──────────────────────────────────────────
  if (gameState === "result") {
    // Encuesta / escala — pantalla neutra, sin correcto/incorrecto
    if (questionType === "poll" || questionType === "scale") {
      return (
        <>
          <div className="gc-state gc-state--waiting" role="status">
            <div className="gc-bg" aria-hidden="true">
              <div className="gc-blob gc-blob-1" /><div className="gc-blob gc-blob-2" /><div className="gc-blob gc-blob-3" />
            </div>
            <div className="gc-state-icon-wrap gc-state-icon-wrap--primary gc-anim-pop" aria-hidden="true">
              <Check size={34} strokeWidth={3} />
            </div>
            <h1 className="gc-state-title gc-result-title-anim">
              ¡Respuesta registrada!
            </h1>
            <p className="gc-total-score gc-result-score-anim">
              Total: <strong>{resultData.totalScore} pts</strong>
            </p>
          </div>
          {reactionPortal}
        </>
      );
    }

    const isCorrect = resultData.isCorrect;
    return (
      <>
      <div className={`gc-state gc-state--result ${isCorrect ? "gc-state--correct" : "gc-state--incorrect"}`}>
        <div className="gc-result-circle gc-result-circle-anim" aria-hidden="true">
          {isCorrect
            ? <Check size={44} strokeWidth={3} />
            : <X     size={44} strokeWidth={3} />
          }
        </div>

        <h1 className="gc-result-title gc-result-title-anim">
          {isCorrect ? "¡Correcto!" : "¡Incorrecto!"}
        </h1>

        <div className="gc-points-card gc-result-card-anim">
          <span className="gc-points-label">Puntos ganados</span>
          <span className="gc-points-value">+{resultData.pointsEarned}</span>
        </div>

        <p className="gc-total-score gc-result-score-anim">
          Total: <strong>{resultData.totalScore} pts</strong>
        </p>

      </div>
      {reactionPortal}
      </>
    );
  }

  // ─── Review ──────────────────────────────────────────
  if (showReview) {
    const correctCount = reviewData.filter(q => q.isCorrect).length;
    return (
      <div className="gc-review">
        <div className="gc-review-header">
          <button className="gc-review-back" onClick={() => setShowReview(false)}>
            ← Volver
          </button>
          <h1 className="gc-review-title">Mis respuestas</h1>
          <span className="gc-review-count">{correctCount}/{reviewData.length}</span>
        </div>

        <div className="gc-review-list">
          {reviewData.map((item, idx) => {
            const isPoll      = item.type === "poll" || item.type === "scale";
            const isOptionless = item.options.length === 0;

            return (
              <div
                key={idx}
                className={`gc-review-card${
                  isPoll         ? ""
                  : item.isCorrect ? " gc-review-card--correct"
                  :                  " gc-review-card--incorrect"
                }`}
              >
                {/* Card header */}
                <div className="gc-review-card-top">
                  <span className="gc-review-num">#{idx + 1}</span>
                  {!isPoll && (
                    <span className={`gc-review-badge gc-review-badge--${item.myAnswer === null ? "skip" : item.isCorrect ? "correct" : "wrong"}`}>
                      {item.myAnswer === null ? "Sin respuesta" : item.isCorrect ? "Correcto" : "Incorrecto"}
                    </span>
                  )}
                  {item.pointsEarned > 0 && (
                    <span className="gc-review-pts">+{item.pointsEarned} pts</span>
                  )}
                </div>

                {/* Image */}
                {item.image && (
                  <img src={item.image} alt="" className="gc-review-img" loading="lazy" />
                )}

                {/* Question text */}
                <p className="gc-review-question">{item.question}</p>

                {/* Options */}
                {!isOptionless && (
                  <div className="gc-review-options">
                    {item.options.map((opt, oi) => {
                      const isCorrectOpt = !isPoll && (
                        Array.isArray(item.answer)
                          ? item.answer.includes(opt)
                          : item.answer === opt
                      );
                      const isMyAnswer = Array.isArray(item.myAnswer)
                        ? item.myAnswer.includes(opt)
                        : item.myAnswer === opt;

                      let mod = "";
                      if (isCorrectOpt && isMyAnswer) mod = " gc-review-opt--chosen-correct";
                      else if (isCorrectOpt)           mod = " gc-review-opt--correct";
                      else if (isMyAnswer)             mod = " gc-review-opt--wrong";

                      return (
                        <div key={oi} className={`gc-review-opt${mod}`}>
                          <span className="gc-review-opt-letter">{OPTION_LETTER[oi]}</span>
                          <span className="gc-review-opt-text">{opt}</span>
                          {isCorrectOpt && <Check size={13} strokeWidth={3} className="gc-review-opt-icon" />}
                          {isMyAnswer && !isCorrectOpt && <X size={13} strokeWidth={3} className="gc-review-opt-icon gc-review-opt-icon--wrong" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Text / slider / scale */}
                {isOptionless && (
                  <div className="gc-review-text-ans">
                    <div className="gc-review-text-row">
                      <span className="gc-review-text-label">Tu respuesta</span>
                      <span className="gc-review-text-val">{item.myAnswer ?? "—"}</span>
                    </div>
                    {!isPoll && item.answer !== undefined && (
                      <div className="gc-review-text-row gc-review-text-row--correct">
                        <span className="gc-review-text-label">Respuesta correcta</span>
                        <span className="gc-review-text-val">{item.answer}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Game over ───────────────────────────────────────
  if (gameState === "game_over") {
    // In team mode, find the player's team and use its rank
    const myTeam = teamResults
      ? teamResults.find(t => t.members.some(m => m.name === myName))
      : null;
    const displayRank = myTeam ? teamResults.indexOf(myTeam) + 1 : finalRank;

    const isWaiting =
      (displayRank === 1 && podiumStep < 3) ||
      (displayRank === 2 && podiumStep < 2) ||
      (displayRank >= 3 && podiumStep < 1);

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
      1: { cls: "gc-state--gold",   icon: <Trophy size={48} />, label: myTeam ? "¡Equipo campeón!" : "¡CAMPEÓN!" },
      2: { cls: "gc-state--silver", icon: <Star   size={48} />, label: myTeam ? "¡Segundo equipo!" : "¡Subcampeón!" },
      3: { cls: "gc-state--bronze", icon: <Star   size={40} />, label: myTeam ? "¡Tercer equipo!"  : "¡Tercer lugar!" },
    };
    const cfg = rankConfig[displayRank] || {
      cls: "gc-state--other",
      icon: null,
      label: displayRank <= 10 ? "¡Top 10!" : "¡Buen trabajo!",
    };

    return (
      <div className={`gc-state gc-state--gameover ${cfg.cls}`}>
        {cfg.cls === "gc-state--other" && (
          <div className="gc-bg" aria-hidden="true">
            <div className="gc-blob gc-blob-1" /><div className="gc-blob gc-blob-2" /><div className="gc-blob gc-blob-3" />
          </div>
        )}

        {myTeam && (
          <motion.div
            className="gc-team-badge"
            style={{ background: myTeam.color }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
          >
            {myTeam.name[0]}
          </motion.div>
        )}

        {cfg.icon && !myTeam && (
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
          {myTeam ? `Tu equipo (${myTeam.name}) quedó en` : "Quedaste en"}
        </motion.p>
        <motion.h1
          className="gc-rank-number"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          #{displayRank}
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

        {reviewData.length > 0 && (
          <motion.button
            className="gc-btn-review"
            onClick={() => setShowReview(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.64 }}
          >
            Ver mis respuestas
          </motion.button>
        )}

        <motion.button
          className="gc-btn-exit"
          onClick={() => navigate("/join")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.78 }}
          aria-label="Salir del juego"
        >
          Salir del juego
        </motion.button>
      </div>
    );
  }

  return null;
}
