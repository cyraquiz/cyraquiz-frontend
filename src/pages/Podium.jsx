import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star } from "lucide-react";
import { socket } from "../socket";
import { getAvatarSrc } from "../utils/avatars";
import confetti from "canvas-confetti";
import useSound from "use-sound";
import "../styles/Podium.css";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];

const slideUp = {
  hidden:  { opacity: 0, y: 64 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.62, ease: EASE_OUT_EXPO } },
};

const popIn = {
  hidden:  { opacity: 0, scale: 0.82 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.68, ease: EASE_OUT_EXPO } },
};

export default function Podium() {
  const { roomCode } = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const hostToken   = location.state?.hostToken;

  const [sortedPlayers, setSortedPlayers] = useState([]);
  const [first,         setFirst]         = useState(null);
  const [second,        setSecond]        = useState(null);
  const [third,         setThird]         = useState(null);
  const [step,          setStep]          = useState(0);
  const [isTie,         setIsTie]         = useState(false);
  const [tieMessage,    setTieMessage]    = useState("");
  const [isTripleTie,   setIsTripleTie]   = useState(false);

  const [playDrumroll, { pause: pauseDrumroll, stop: stopDrumroll }] =
    useSound("/redoble.mp3", { loop: true, volume: 0.5 });
  const [playThird]                          = useSound("/tercer.mp3",  { volume: 0.7 });
  const [playSecond]                         = useSound("/segundo.mp3", { volume: 0.7 });
  const [playVictory1, { stop: stopVictory1 }] = useSound("/win.mp3",    { volume: 0.7 });
  const [playVictory2, { stop: stopVictory2 }] = useSound("/aplauso.wav",{ volume: 0.7 });

  useEffect(() => {
    return () => {
      stopDrumroll();
      stopVictory1();
      stopVictory2();
    };
  }, [stopDrumroll, stopVictory1, stopVictory2]);

  useEffect(() => {
    socket.emit("game_over", { roomCode, hostToken });

    socket.on("final_results", (results) => {
      setSortedPlayers(results);
      const p1 = results[0];
      const p2 = results[1];
      const p3 = results[2];

      setFirst(p1);
      setSecond(p2);
      setThird(p3);

      const isTripleTieCheck =
        p1 && p2 && p3 &&
        p1.score === p2.score && p2.score === p3.score && p1.score > 0;
      const isDoubleTieCheck = p1 && p2 && p1.score === p2.score && p1.score > 0;

      let tieDetected = false;
      let tieText     = "";

      if (isTripleTieCheck) {
        tieDetected = true;
        tieText     = "Triple empate: resolviendo por velocidad";
        setIsTripleTie(true);
      } else if (isDoubleTieCheck) {
        tieDetected = true;
        tieText     = "Empate de puntos: resolviendo por velocidad";
        setIsTripleTie(false);
      } else {
        setIsTripleTie(false);
      }

      setIsTie(tieDetected);
      setTieMessage(tieText);
      startAnimation(tieDetected);
    });

    return () => { socket.off("final_results"); };
  }, []);

  const startAnimation = (tieDetected) => {
    setTimeout(() => setStep(1), 3000);

    if (tieDetected) {
      setTimeout(() => setStep(1.5), 5000);
      setTimeout(() => { setStep(3); triggerConfetti(); }, 8000);
    } else {
      setTimeout(() => setStep(2), 6000);
      setTimeout(() => { setStep(3); triggerConfetti(); }, 10000);
    }
  };

  useEffect(() => {
    if (step === 0) {
      playDrumroll();
    } else if (step === 1) {
      pauseDrumroll();
      playThird();
      setTimeout(() => playDrumroll(), 2000);
    } else if (step === 2) {
      pauseDrumroll();
      playSecond();
      setTimeout(() => playDrumroll(), 2000);
    } else if (step === 3) {
      stopDrumroll();
      playVictory1();
      playVictory2();
    }
  }, [step, playDrumroll, pauseDrumroll, stopDrumroll, playThird, playSecond, playVictory1, playVictory2]);

  const triggerConfetti = () => {
    const duration = 3500;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60,  spread: 55, origin: { x: 0 }, colors: ["#F0BC38", "#ffffff", "#5A0E24"] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#F0BC38", "#ffffff", "#5A0E24"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const isThirdVisible  = (step >= 1 && !isTripleTie) || step >= 3;
  const isSecondVisible = step >= 2;
  const isFirstVisible  = step >= 3;

  return (
    <div className="pd-wrapper">
      {/* Atmospheric background */}
      <div className="pd-bg" aria-hidden="true">
        <div className="pd-blob pd-blob-1" />
        <div className="pd-blob pd-blob-2" />
        <div className="pd-blob pd-blob-3" />
      </div>

      {/* Stage lights — sweep during drumroll, settle when positions reveal */}
      <motion.div
        className="pd-light pd-light-left"
        aria-hidden="true"
        animate={step < 3
          ? { rotate: [-28, -6, -28] }
          : { rotate: -16 }
        }
        transition={step < 3
          ? { duration: 3.8, repeat: Infinity, ease: "easeInOut" }
          : { duration: 1.4, ease: EASE_OUT_EXPO }
        }
      />
      <motion.div
        className="pd-light pd-light-right"
        aria-hidden="true"
        animate={step < 3
          ? { rotate: [28, 6, 28] }
          : { rotate: 16 }
        }
        transition={step < 3
          ? { duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }
          : { duration: 1.4, ease: EASE_OUT_EXPO }
        }
      />

      {/* Header */}
      <header className="pd-header">
        <p className="pd-eyebrow">Resultados finales</p>
        <h1 className="pd-title">¡Ganadores!</h1>
      </header>

      {/* Tie alert */}
      <AnimatePresence>
        {step === 1.5 && isTie && (
          <motion.div
            className="pd-tie-banner"
            role="status"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          >
            {tieMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drumroll / calculating state */}
      <AnimatePresence>
        {step === 0 && (
          <motion.p
            className="pd-calculating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
            >
              Calculando posiciones...
            </motion.span>
          </motion.p>
        )}
      </AnimatePresence>

      {/* Podium stage */}
      <div className="pd-stage" role="region" aria-label="Podio de ganadores">

        {/* 2nd place — left */}
        <AnimatePresence>
          {isSecondVisible && second && (
            <motion.div
              className="pd-column pd-column--second"
              variants={slideUp}
              initial="hidden"
              animate="visible"
            >
              <div className="pd-player">
                <div className="pd-rank-badge pd-rank-badge--silver">
                  <Star size={16} strokeWidth={2.5} aria-hidden="true" />
                </div>
                <div className="pd-avatar-ring pd-avatar-ring--silver">
                  <img src={getAvatarSrc(second.avatar || second.name)} alt={second.name} className="pd-avatar" loading="lazy" />
                </div>
                <p className="pd-name">{second.name}</p>
                <div className="pd-stats">
                  <span className="pd-score">{second.score}<span className="pd-unit"> pts</span></span>
                  <span className="pd-time">{(second.timeAccumulated / 1000).toFixed(2)}s</span>
                </div>
              </div>
              <div className="pd-block pd-block--second" aria-label="Segundo lugar">
                <span className="pd-block-num">2</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1st place — center */}
        <AnimatePresence>
          {isFirstVisible && first && (
            <motion.div
              className="pd-column pd-column--first"
              variants={popIn}
              initial="hidden"
              animate="visible"
            >
              <div className="pd-player pd-player--first">
                <div className="pd-rank-badge pd-rank-badge--gold">
                  <Trophy size={18} strokeWidth={2.5} aria-hidden="true" />
                </div>
                <div className="pd-avatar-ring pd-avatar-ring--gold">
                  <img src={getAvatarSrc(first.avatar || first.name)} alt={first.name} className="pd-avatar pd-avatar--xl" loading="lazy" />
                </div>
                <p className="pd-name pd-name--gold">{first.name}</p>
                <div className="pd-stats pd-stats--gold">
                  <span className="pd-score">{first.score}<span className="pd-unit"> pts</span></span>
                  <span className="pd-time">{(first.timeAccumulated / 1000).toFixed(2)}s</span>
                </div>
              </div>
              <div className="pd-block pd-block--first" aria-label="Primer lugar">
                <span className="pd-block-num">1</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3rd place — right */}
        <AnimatePresence>
          {isThirdVisible && third && (
            <motion.div
              className="pd-column pd-column--third"
              variants={slideUp}
              initial="hidden"
              animate="visible"
            >
              <div className="pd-player">
                <div className="pd-rank-badge pd-rank-badge--bronze">
                  <Star size={14} strokeWidth={2.5} aria-hidden="true" />
                </div>
                <div className="pd-avatar-ring pd-avatar-ring--bronze">
                  <img src={getAvatarSrc(third.avatar || third.name)} alt={third.name} className="pd-avatar" loading="lazy" />
                </div>
                <p className="pd-name">{third.name}</p>
                <div className="pd-stats">
                  <span className="pd-score">{third.score}<span className="pd-unit"> pts</span></span>
                  <span className="pd-time">{(third.timeAccumulated / 1000).toFixed(2)}s</span>
                </div>
              </div>
              <div className="pd-block pd-block--third" aria-label="Tercer lugar">
                <span className="pd-block-num">3</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Return CTA */}
      <AnimatePresence>
        {step === 3 && (
          <motion.div
            className="pd-footer"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.5 }}
          >
            <button className="pd-btn-return" onClick={() => navigate("/host")}>
              Volver al inicio
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard — 4th place onward, below the CTA */}
      <AnimatePresence>
        {step >= 3 && sortedPlayers.length > 3 && (
          <motion.section
            className="pd-leaderboard"
            aria-label="Clasificación general"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE_OUT_EXPO, delay: 0.65 }}
          >
            <h2 className="pd-lb-heading">Clasificación general</h2>
            <ol className="pd-lb-list">
              {sortedPlayers.slice(3).map((p, index) => (
                <motion.li
                  key={p.name}
                  className="pd-lb-row"
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.75 + index * 0.05 }}
                >
                  <span className="pd-lb-rank">{index + 4}</span>
                  <img src={getAvatarSrc(p.avatar || p.name)} alt={p.name} className="pd-lb-avatar" loading="lazy" />
                  <span className="pd-lb-name">{p.name}</span>
                  <span className="pd-lb-score">{p.score} pts</span>
                  <span className="pd-lb-time">{(p.timeAccumulated / 1000).toFixed(2)}s</span>
                </motion.li>
              ))}
            </ol>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
