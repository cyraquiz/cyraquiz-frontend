import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronRight, Check, AlertTriangle, Users, BarChart2, Sparkles, X,
} from "lucide-react";
import { socket } from "../socket";
import useSound from "use-sound";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { apiFetch } from "../utils/api";
import { OPTION_BG, OPTION_SHADOW, OPTION_LETTER } from "../constants/game";
import "../styles/HostGame.css";

function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const WC_COLORS = [
  "oklch(0.75 0.20 25)",
  "oklch(0.72 0.19 55)",
  "oklch(0.65 0.20 155)",
  "oklch(0.60 0.22 255)",
  "oklch(0.65 0.22 295)",
  "oklch(0.68 0.20 185)",
];

function WordCloud({ words, correctAnswer }) {
  const max = Math.max(...words.map(w => w.count), 1);

  if (!words.length) {
    return (
      <div className="hg-wordcloud-empty" aria-live="polite">
        Esperando respuestas…
      </div>
    );
  }

  return (
    <div className="hg-wordcloud" role="img" aria-label="Nube de respuestas">
      <AnimatePresence>
        {words.map(({ text, count }, i) => {
          const ratio   = count / max;
          const size    = 1.1 + ratio * 2.4;
          const isRight = correctAnswer && text.toLowerCase() === correctAnswer.toLowerCase();
          return (
            <motion.span
              key={text}
              className={`hg-wordcloud-word${isRight ? " hg-wordcloud-word--correct" : ""}`}
              style={{ fontSize: `${size}rem`, color: isRight ? "oklch(0.85 0.22 145)" : WC_COLORS[i % WC_COLORS.length] }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              {text}
              {count > 1 && <sup className="hg-wordcloud-sup">{count}</sup>}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default function HostGame() {
  const { roomCode } = useParams();
  const location     = useLocation();
  const navigate     = useNavigate();

  const quizData        = location.state?.quizData;
  const players         = location.state?.players || [];
  const hostToken       = location.state?.hostToken;
  const questionsList   = quizData?.questions || quizData?.questionsData || [];
  const questionMusicUrl = location.state?.questionMusic || "/question.mp3";
  const speedMode          = location.state?.speedMode        || false;
  const examMode           = location.state?.examMode         || false;
  const tournamentMode     = location.state?.tournamentMode   || false;
  const questionsPerRound  = location.state?.questionsPerRound || 3;

  const videoUrl  = quizData?.video_url || "";
  const videoMode = !!extractYouTubeId(videoUrl);

  const videoTimedQuestions = useMemo(() => {
    if (!videoMode) return [];
    return [...questionsList]
      .filter(q => q.timestamp != null && q.timestamp > 0)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [videoMode, questionsList]);

  const activeQuestionsList = videoMode ? videoTimedQuestions : questionsList;
  const activeLen           = activeQuestionsList.length;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft,             setTimeLeft]             = useState(null);
  const [isShowingResult,      setIsShowingResult]      = useState(false);
  const [answersCount,         setAnswersCount]         = useState(0);
  const [startCountdown,       setStartCountdown]       = useState(3);
  const [showCancelModal,      setShowCancelModal]      = useState(false);
  const [stats,                setStats]                = useState([0, 0, 0, 0]);
  const [reactions,            setReactions]            = useState([]);
  const [textAnswers,          setTextAnswers]          = useState([]);
  const [drawings,             setDrawings]             = useState([]);
  const [videoPhase,           setVideoPhase]           = useState(videoMode ? "playing" : "idle");

  // Tournament state
  const [bracket,              setBracket]              = useState([]);
  const [roundResults,         setRoundResults]         = useState(null); // null = no round over yet
  const [currentTRound,        setCurrentTRound]        = useState(1);
  const [questionsInRound,     setQuestionsInRound]     = useState(0);
  const [isChampion,           setIsChampion]           = useState(false);
  const [champion,             setChampion]             = useState(null);

  // Performance log (F10)
  const [perfLog,              setPerfLog]              = useState([]);
  const [perfOpen,             setPerfOpen]             = useState(false);
  const [perfPractice,         setPerfPractice]         = useState([]);
  const [perfLoading,          setPerfLoading]          = useState(false);

  const statsRef        = useRef(stats);
  const answersCountRef = useRef(answersCount);
  const perfLoggedRef   = useRef(-1);

  const videoPlayerRef = useRef(null);
  const videoQIndexRef = useRef(0);
  const handleNextRef  = useRef(null);

  const [playCountdown, { stop: stopCountdown }] = useSound("/countdown.wav",  { volume: 0.6 });
  const [playResultSound]                        = useSound("/result.mp3",      { volume: 0.7 });

  // Four music tracks — all hooks always called (Rules of Hooks)
  const [playM1, { stop: stopM1 }] = useSound("/question.mp3", { volume: 0.4, loop: true });
  const [playM2, { stop: stopM2 }] = useSound("/lobby.mp3",    { volume: 0.35, loop: true });
  const [playM3, { stop: stopM3 }] = useSound("/music-arcade.mp3", { volume: 0.4, loop: true });
  const [playM4, { stop: stopM4 }] = useSound("/music-retro.mp3",  { volume: 0.4, loop: true });

  const playQuestionMusic = useCallback(() => {
    stopM1(); stopM2(); stopM3(); stopM4();
    if (questionMusicUrl === "none")               return;
    if (questionMusicUrl === "/lobby.mp3")         { playM2(); return; }
    if (questionMusicUrl === "/music-arcade.mp3")  { playM3(); return; }
    if (questionMusicUrl === "/music-retro.mp3")   { playM4(); return; }
    playM1();
  }, [questionMusicUrl, playM1, playM2, playM3, playM4, stopM1, stopM2, stopM3, stopM4]);

  const stopQuestionMusic = useCallback(() => {
    stopM1(); stopM2(); stopM3(); stopM4();
  }, [stopM1, stopM2, stopM3, stopM4]);

  const nextLocked      = useRef(false);
  const cancelModalRef  = useFocusTrap(showCancelModal);

  const currentQ = activeQuestionsList[currentQuestionIndex];

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
    if (videoMode) { stopQuestionMusic(); return () => stopQuestionMusic(); }
    if (startCountdown < 0 && !isShowingResult) {
      playQuestionMusic();
    } else {
      stopQuestionMusic();
    }
    return () => stopQuestionMusic();
  }, [startCountdown, isShowingResult, videoMode, playQuestionMusic, stopQuestionMusic]);

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

  // ─── Keep live refs current ─────────────────────────
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { answersCountRef.current = answersCount; }, [answersCount]);

  // ─── Track per-question performance (F10) ───────────
  useEffect(() => {
    if (!isShowingResult || !currentQ) return;
    if (perfLoggedRef.current === currentQuestionIndex) return;
    perfLoggedRef.current = currentQuestionIndex;

    const type  = currentQ.type || "single";
    const total = answersCountRef.current || 0;
    const s     = statsRef.current;
    let correctPct = null;

    if ((type === "single" || type === "tf") && currentQ.options && currentQ.answer) {
      const idx = currentQ.options.indexOf(currentQ.answer);
      if (idx >= 0) correctPct = total > 0 ? Math.round((s[idx] / total) * 100) : 0;
    } else if (type === "multi" && Array.isArray(currentQ.answer) && currentQ.options) {
      const idxs = currentQ.answer.map(a => currentQ.options.indexOf(a)).filter(i => i >= 0);
      if (idxs.length) {
        const minCorrect = Math.min(...idxs.map(i => s[i] || 0));
        correctPct = total > 0 ? Math.round((minCorrect / total) * 100) : 0;
      }
    }

    setPerfLog(prev => [...prev, {
      qIndex:     currentQuestionIndex,
      question:   currentQ.question,
      difficulty: currentQ.difficulty || "medium",
      correctPct,
      type,
    }]);
  }, [isShowingResult, currentQuestionIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── New question setup ─────────────────────────────
  useEffect(() => {
    if (startCountdown !== -1) return;
    if (videoMode && videoPhase !== "questioning") return;
    const q = activeQuestionsList[currentQuestionIndex];
    if (!q) return;
    nextLocked.current = false;
    setIsShowingResult(false);
    setAnswersCount(0);
    if (tournamentMode) setQuestionsInRound(prev => prev + 1);
    setStats(Array.from({ length: (q.options || []).length }, () => 0));
    setTextAnswers([]);
    setDrawings([]);
    const questionTime = speedMode ? 5 : (q.time || 20);
    setTimeLeft(questionTime);
    socket.emit("send_question", {
      roomCode,
      question: q,
      time: questionTime,
      hostToken,
    });
    const onPlayerAnswered    = () => setAnswersCount(prev => prev + 1);
    const onUpdateStats       = (s) => setStats(s);
    const onUpdateTextAnswers = (arr) => setTextAnswers(arr);
    socket.on("player_answered",     onPlayerAnswered);
    socket.on("update_stats",        onUpdateStats);
    socket.on("update_text_answers", onUpdateTextAnswers);
    return () => {
      socket.off("player_answered",     onPlayerAnswered);
      socket.off("update_stats",        onUpdateStats);
      socket.off("update_text_answers", onUpdateTextAnswers);
    };
  }, [currentQuestionIndex, startCountdown, roomCode, activeQuestionsList, videoMode, videoPhase]);

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

  // ─── Live reactions ─────────────────────────────────
  useEffect(() => {
    const onReaction = ({ emoji }) => {
      const id = Math.random().toString(36).slice(2);
      const x  = 4 + Math.random() * 88;
      setReactions(prev => [...prev, { id, emoji, x }]);
    };
    socket.on("reaction", onReaction);
    return () => socket.off("reaction", onReaction);
  }, []);

  // ─── Draw It drawings ────────────────────────────────
  useEffect(() => {
    const onDrawing = (drawing) => setDrawings(prev => [...prev, drawing]);
    socket.on("drawing_received", onDrawing);
    return () => socket.off("drawing_received", onDrawing);
  }, []);

  // Word cloud data (text-type questions)
  const wordCloudData = useMemo(() => {
    if (!textAnswers.length) return [];
    const freq = {};
    textAnswers.forEach(a => {
      const word = a.trim();
      if (word) freq[word] = (freq[word] || 0) + 1;
    });
    return Object.entries(freq)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40);
  }, [textAnswers]);

  const handleNext = useCallback(() => {
    if (nextLocked.current) return;
    nextLocked.current = true;
    if (currentQuestionIndex < activeLen - 1) {
      setTimeLeft(null);
      setIsShowingResult(false);
      setAnswersCount(0);
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      socket.emit("game_over", { roomCode, hostToken });
      navigate(`/podium/${roomCode}`, { state: { quizData, players, hostToken } });
    }
  }, [currentQuestionIndex, activeLen, roomCode, hostToken, quizData, players, navigate]);

  // ─── Speed Round auto-advance ────────────────────────
  useEffect(() => {
    if (!speedMode || videoMode || !isShowingResult) return;
    const t = setTimeout(handleNext, 1500);
    return () => clearTimeout(t);
  }, [isShowingResult, speedMode, videoMode, handleNext]);

  // ─── Keep handleNextRef current ─────────────────────
  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);

  // ─── Load YouTube IFrame API script ─────────────────
  useEffect(() => {
    if (!videoMode) return;
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }, [videoMode]);

  // ─── Init YouTube player when countdown done ─────────
  useEffect(() => {
    if (startCountdown !== -1 || !videoMode) return;
    const ytId = extractYouTubeId(videoUrl);
    if (!ytId) return;

    const initPlayer = () => {
      videoPlayerRef.current = new window.YT.Player("yt-player", {
        videoId: ytId,
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0, playsinline: 1 },
        events: {
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              handleNextRef.current?.();
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        initPlayer();
      };
    }

    return () => {
      if (videoPlayerRef.current?.destroy) {
        try { videoPlayerRef.current.destroy(); } catch {}
        videoPlayerRef.current = null;
      }
    };
  }, [startCountdown, videoMode, videoUrl]);

  // ─── Poll video timestamps ───────────────────────────
  useEffect(() => {
    if (!videoMode || videoPhase !== "playing") return;
    const interval = setInterval(() => {
      if (!videoPlayerRef.current?.getCurrentTime) return;
      const nextQ = videoTimedQuestions[videoQIndexRef.current];
      if (!nextQ) return;
      let t;
      try { t = videoPlayerRef.current.getCurrentTime(); } catch { return; }
      if (t >= nextQ.timestamp) {
        try { videoPlayerRef.current.pauseVideo(); } catch {}
        const qIdx = videoQIndexRef.current;
        videoQIndexRef.current++;
        setCurrentQuestionIndex(qIdx);
        setAnswersCount(0);
        setVideoPhase("questioning");
      }
    }, 250);
    return () => clearInterval(interval);
  }, [videoMode, videoPhase, videoTimedQuestions]);

  // ─── Resume video after result (video mode) ──────────
  useEffect(() => {
    if (!videoMode || !isShowingResult) return;
    const isLast = currentQuestionIndex >= videoTimedQuestions.length - 1;
    const t = setTimeout(() => {
      if (isLast) {
        handleNextRef.current?.();
      } else {
        try { videoPlayerRef.current?.playVideo(); } catch {}
        setIsShowingResult(false);
        setVideoPhase("playing");
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [isShowingResult, videoMode, currentQuestionIndex, videoTimedQuestions.length]);

  // ─── Tournament socket listeners ──────────────────────
  useEffect(() => {
    if (!tournamentMode) return;
    const onBracket = ({ bracket: b, round, questionsPerRound: qpr }) => {
      setBracket(b);
      setCurrentTRound(round);
    };
    const onRoundOver = (data) => {
      setRoundResults(data);
      if (data.isChampion) { setIsChampion(true); setChampion(data.champion); }
      else { setBracket(data.nextBracket); }
    };
    const onNextRound = ({ bracket: b, round }) => {
      setBracket(b);
      setCurrentTRound(round);
      setRoundResults(null);
      setQuestionsInRound(0);
    };
    socket.on("tournament_bracket", onBracket);
    socket.on("round_over",         onRoundOver);
    socket.on("tournament_next_round", onNextRound);
    return () => {
      socket.off("tournament_bracket",    onBracket);
      socket.off("round_over",            onRoundOver);
      socket.off("tournament_next_round", onNextRound);
    };
  }, [tournamentMode]);

  const handleEndRound = () => {
    socket.emit("end_round", { roomCode, hostToken });
  };

  const handlePerfAnalysis = async () => {
    const weak = perfLog
      .filter(p => p.correctPct !== null && p.correctPct < 60)
      .sort((a, b) => a.correctPct - b.correctPct)
      .slice(0, 5);
    if (!weak.length) return;
    setPerfLoading(true);
    setPerfPractice([]);
    try {
      const content = weak
        .map(p => `Pregunta: "${p.question}" (${p.correctPct}% correctos)`)
        .join("\n");
      const res  = await apiFetch("/generate-text", {
        method: "POST",
        body: JSON.stringify({ mode: "text", content }),
      });
      const data = await res.json();
      if (res.ok) setPerfPractice(data.questions || []);
    } catch { /* silent */ } finally {
      setPerfLoading(false);
    }
  };

  const handleStartNextRound = () => {
    socket.emit("start_next_round", { roomCode, hostToken });
    nextLocked.current = false;
  };

  const formatTime = (s) => {
    if (s === null) return "···";
    if (s < 60) return s;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r < 10 ? "0" : ""}${r}`;
  };

  const timerMax = speedMode ? 5 : (currentQ?.time || 20);
  const timerPct = timeLeft !== null ? (timeLeft / timerMax) * 100 : 100;

  const timerUrgency =
    timeLeft !== null && timeLeft <= 5  ? "critical" :
    timeLeft !== null && timeLeft <= 10 ? "warning"  : "normal";

  const isLastQuestion = currentQuestionIndex === activeLen - 1;

  if (!currentQ && !videoMode) {
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
            {speedMode && (
              <span className="hg-speed-badge" aria-label="Speed Round activo">⚡ SPEED</span>
            )}
            {examMode && (
              <span className="hg-exam-badge" aria-label="Modo Examen activo">📋 EXAMEN</span>
            )}
            {videoMode && (
              <span className="hg-video-badge" aria-label="Video Quiz activo">🎬 VIDEO</span>
            )}
            {tournamentMode && (
              <span className="hg-tournament-badge" aria-label="Modo Torneo activo">
                🏆 R{currentTRound}
              </span>
            )}
          </div>
        </div>

        <div className="hg-nav-right">
          {/* Perf analysis button — visible once we have data */}
          {perfLog.length > 0 && (
            <button
              className="hg-btn-perf"
              onClick={() => { setPerfOpen(true); setPerfPractice([]); }}
              aria-label="Ver análisis de rendimiento"
              title="Análisis IA"
            >
              <BarChart2 size={14} />
            </button>
          )}
          <AnimatePresence>
            {isShowingResult && !speedMode && !videoMode && (
              tournamentMode && questionsInRound >= questionsPerRound ? (
                <motion.button
                  className="hg-btn-next hg-btn-round-over"
                  onClick={handleEndRound}
                  initial={{ opacity: 0, x: 18, scale: 0.88 }}
                  animate={{ opacity: 1, x: 0,  scale: 1    }}
                  exit={{    opacity: 0, x: 12, scale: 0.92 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  aria-label="Ver resultados de la ronda"
                >
                  <span>Fin de Ronda</span>
                  <ChevronRight size={15} aria-hidden="true" />
                </motion.button>
              ) : (
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
              )
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

      {/* ─ YouTube video screen ─────────────────────── */}
      {videoMode && (
        <div
          className={`hg-video-screen${videoPhase === "playing" ? " hg-video-screen--active" : ""}`}
          aria-hidden={videoPhase !== "playing"}
        >
          <div id="yt-player" className="hg-video-player" />
          {videoPhase === "playing" && (
            <p className="hg-video-hint">
              ▶ El video se pausará automáticamente para cada pregunta
            </p>
          )}
        </div>
      )}

      {/* ─ Main content ─────────────────────────────── */}
      <main className={`hg-main${videoMode && videoPhase === "playing" ? " hg-main--hidden" : ""}`} id="main-content">
      {currentQ && (<>

        {/* Question card */}
        <div className={`hg-question-area${currentQ.image ? " hg-question-area--has-image" : ""}${isShowingResult ? " hg-question-area--results" : ""}`}>
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

        {/* Image slot — below question, hidden during results */}
        {currentQ.image && (
          <div className={`hg-image-slot${isShowingResult ? " hg-image-slot--hidden" : ""}`}>
            <img
              src={currentQ.image}
              alt=""
              className="hg-question-image"
              loading="eager"
            />
          </div>
        )}

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

        {/* Word cloud — preguntas de texto, en tiempo real */}
        {currentQ.type === "text" && (
          <div className="hg-wordcloud-area">
            <WordCloud
              words={wordCloudData}
              correctAnswer={isShowingResult ? currentQ.answer : null}
            />
            {isShowingResult && (
              <motion.div
                className="hg-answer-reveal-badge"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              >
                <Check size={13} strokeWidth={3} aria-hidden="true" />
                <span>Respuesta correcta: <strong>{currentQ.answer}</strong></span>
              </motion.div>
            )}
          </div>
        )}

        {/* Draw It — galería de dibujos */}
        {currentQ.type === "draw" && (
          <div className="hg-draw-area">
            {!isShowingResult && (
              <p className="hg-draw-waiting">
                ✏️ Esperando dibujos… {drawings.length > 0 && `(${drawings.length} recibido${drawings.length !== 1 ? "s" : ""})`}
              </p>
            )}
            {(isShowingResult || drawings.length > 0) && (
              <div className="hg-draw-gallery">
                {drawings.map((d, i) => (
                  <motion.div
                    key={i}
                    className="hg-draw-card"
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                  >
                    <img src={d.imageData} alt={`Dibujo de ${d.playerName}`} className="hg-draw-img" />
                    <span className="hg-draw-name">{d.playerName}</span>
                  </motion.div>
                ))}
                {isShowingResult && drawings.length === 0 && (
                  <p className="hg-draw-empty">Ningún estudiante envió un dibujo.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reveal para slider — sin opciones, sin tipo text */}
        {isShowingResult && currentQ.type !== "text" && currentQ.type !== "draw" && (!currentQ.options || currentQ.options.length === 0) && (
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

      </>)}
      </main>

      {/* ─ Tournament bracket overlay ───────────────── */}
      <AnimatePresence>
        {roundResults && (
          <motion.div
            className="hg-bracket-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="hg-bracket-modal"
              initial={{ scale: 0.88, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="hg-bracket-header">
                <span className="hg-bracket-trophy">🏆</span>
                {isChampion ? (
                  <h2 className="hg-bracket-title">¡Tenemos un campeón!</h2>
                ) : (
                  <h2 className="hg-bracket-title">Ronda {roundResults.round} — Resultados</h2>
                )}
              </div>

              {isChampion && champion && (
                <div className="hg-bracket-champion">
                  <span className="hg-bracket-champion-crown">👑</span>
                  <span className="hg-bracket-champion-name">{champion}</span>
                </div>
              )}

              <div className="hg-bracket-matches">
                {roundResults.matchResults.map((m, i) => (
                  <div key={i} className="hg-bracket-match">
                    <div className={`hg-bracket-player${m.winner === m.p1 ? " hg-bracket-player--winner" : " hg-bracket-player--loser"}`}>
                      <span className="hg-bracket-player-name">{m.p1}</span>
                      <span className="hg-bracket-player-score">{m.score1}</span>
                      {m.winner === m.p1 && <span className="hg-bracket-win-mark">✓</span>}
                    </div>
                    <span className="hg-bracket-vs">vs</span>
                    {m.p2 ? (
                      <div className={`hg-bracket-player${m.winner === m.p2 ? " hg-bracket-player--winner" : " hg-bracket-player--loser"}`}>
                        <span className="hg-bracket-player-name">{m.p2}</span>
                        <span className="hg-bracket-player-score">{m.score2}</span>
                        {m.winner === m.p2 && <span className="hg-bracket-win-mark">✓</span>}
                      </div>
                    ) : (
                      <div className="hg-bracket-player hg-bracket-player--bye">
                        <span className="hg-bracket-player-name">BYE</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {isChampion ? (
                <button className="hg-bracket-btn hg-bracket-btn--champion" onClick={handleNext}>
                  Ver podio final
                </button>
              ) : (
                <button className="hg-bracket-btn" onClick={handleStartNextRound}>
                  Siguiente Ronda →
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <div className="hg-bottom-stat hg-bottom-stat--right" aria-label={`Pregunta ${currentQuestionIndex + 1} de ${activeLen}`}>
              <div className="hg-bottom-stat-row">
                <span className="hg-bottom-big">
                  {currentQuestionIndex + 1}
                  <span className="hg-bottom-of">/{activeLen}</span>
                </span>
              </div>
              <span className="hg-bottom-label">Pregunta</span>
            </div>
            <div className="hg-bottom-divider" aria-hidden="true" />
            <div className="hg-bottom-stat hg-bottom-stat--right" aria-label={`${currentQ?.points || 100} puntos`}>
              <span className="hg-bottom-big">{currentQ?.points || 100}</span>
              <span className="hg-bottom-label">Puntos</span>
            </div>
          </div>

        </div>
      </div>

      {/* ─ Live reactions layer ──────────────────────── */}
      <div className="hg-reactions-layer" aria-hidden="true">
        {reactions.map(r => (
          <span
            key={r.id}
            className="hg-reaction-float"
            style={{ left: `${r.x}%` }}
            onAnimationEnd={() => setReactions(prev => prev.filter(x => x.id !== r.id))}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {/* ─ Performance Analysis modal (F10) ────────── */}
      <AnimatePresence>
        {perfOpen && (
          <motion.div
            className="hg-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setPerfOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hg-perf-title"
          >
            <motion.div
              className="hg-modal hg-perf-modal"
              initial={{ scale: 0.88, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.93, y: 12, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
            >
              <div className="hg-perf-header">
                <BarChart2 size={17} className="hg-perf-icon" />
                <h2 className="hg-perf-title" id="hg-perf-title">Análisis de rendimiento</h2>
                <button className="hg-perf-close" onClick={() => setPerfOpen(false)} aria-label="Cerrar">
                  <X size={14} />
                </button>
              </div>

              {/* Questions sorted worst → best */}
              <ul className="hg-perf-list">
                {[...perfLog]
                  .sort((a, b) => {
                    const pa = a.correctPct ?? 101;
                    const pb = b.correctPct ?? 101;
                    return pa - pb;
                  })
                  .map((p, i) => {
                    const pct = p.correctPct;
                    const level = pct === null ? "na" : pct < 40 ? "hard" : pct < 70 ? "medium" : "easy";
                    const emoji = { easy: "🟢", medium: "🟡", hard: "🔴", na: "⚪" }[level];
                    const diffLabel = { easy: "Fácil", medium: "Media", hard: "Difícil", na: "—" }[level];
                    return (
                      <li key={p.qIndex} className={`hg-perf-item hg-perf-item--${level}`}>
                        <span className="hg-perf-num">{p.qIndex + 1}</span>
                        <span className="hg-perf-q">{p.question}</span>
                        <div className="hg-perf-meta">
                          <span className="hg-perf-diff">{emoji} {diffLabel}</span>
                          <span className="hg-perf-pct">
                            {pct !== null ? `${pct}% ✓` : "—"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
              </ul>

              {/* AI practice generation */}
              {perfLog.some(p => p.correctPct !== null && p.correctPct < 60) && (
                <div className="hg-perf-ai-section">
                  <button
                    className="hg-perf-ai-btn"
                    onClick={handlePerfAnalysis}
                    disabled={perfLoading}
                  >
                    <Sparkles size={13} />
                    {perfLoading ? "Generando…" : "Generar práctica para temas débiles"}
                  </button>

                  {perfPractice.length > 0 && (
                    <ul className="hg-perf-practice-list">
                      {perfPractice.map((q, i) => (
                        <li key={i} className="hg-perf-practice-item">
                          <span className="hg-perf-practice-num">{i + 1}</span>
                          <span className="hg-perf-practice-q">{q.question}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              ref={cancelModalRef}
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
