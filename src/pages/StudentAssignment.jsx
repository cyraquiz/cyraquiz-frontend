import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, ChevronRight, User, BookOpen, Home } from "lucide-react";
import "../styles/StudentAssignment.css";

const API = import.meta.env.VITE_API_URL;

function gradeAnswer(q, given) {
  if (!q.answer || ["poll", "scale"].includes(q.type)) return null;
  if (q.type === "single" || q.type === "tf") return given === q.answer;
  if (q.type === "multi") {
    const correct = Array.isArray(q.answer) ? q.answer : [q.answer];
    const givenArr = Array.isArray(given) ? given : [];
    return correct.length === givenArr.length && correct.every((a) => givenArr.includes(a));
  }
  if (q.type === "text") {
    return given?.trim().toLowerCase() === String(q.answer).trim().toLowerCase();
  }
  if (q.type === "slider") return parseInt(given) === parseInt(q.answer);
  return false;
}

function QuestionView({ q, answer, onChange }) {
  const type = q.type || "single";

  if (type === "single" || type === "tf" || type === "poll") {
    return (
      <div className="sa-options">
        {(q.options || []).map((opt, i) => (
          <button
            key={i}
            className={`sa-option${answer === opt ? " sa-option--selected" : ""}`}
            onClick={() => onChange(opt)}
          >
            <span className="sa-option-letter">{String.fromCharCode(65 + i)}</span>
            <span className="sa-option-text">{opt}</span>
          </button>
        ))}
      </div>
    );
  }

  if (type === "multi") {
    const selected = Array.isArray(answer) ? answer : [];
    return (
      <div className="sa-options">
        {(q.options || []).map((opt, i) => {
          const checked = selected.includes(opt);
          return (
            <button
              key={i}
              className={`sa-option${checked ? " sa-option--selected" : ""}`}
              onClick={() => {
                onChange(checked ? selected.filter((x) => x !== opt) : [...selected, opt]);
              }}
            >
              <span className={`sa-option-check${checked ? " checked" : ""}`}>
                {checked && "✓"}
              </span>
              <span className="sa-option-text">{opt}</span>
            </button>
          );
        })}
        <p className="sa-hint">Selecciona todas las que apliquen</p>
      </div>
    );
  }

  if (type === "text") {
    return (
      <div className="sa-text-input-wrap">
        <input
          className="sa-text-input"
          placeholder="Tu respuesta..."
          value={answer || ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={200}
          autoFocus
        />
      </div>
    );
  }

  if (type === "scale") {
    const val = answer ?? null;
    return (
      <div className="sa-scale">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            className={`sa-scale-btn${val === n ? " sa-scale-btn--active" : ""}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
        <div className="sa-scale-labels">
          <span>Muy malo</span>
          <span>Excelente</span>
        </div>
      </div>
    );
  }

  if (type === "slider") {
    const min = q.min ?? 0;
    const max = q.max ?? 100;
    const val = answer ?? min;
    return (
      <div className="sa-slider-wrap">
        <input
          type="range"
          min={min}
          max={max}
          value={val}
          onChange={(e) => onChange(Number(e.target.value))}
          className="sa-slider"
        />
        <span className="sa-slider-value">{val}</span>
      </div>
    );
  }

  return null;
}

export default function StudentAssignment() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading");
  const [assignment, setAssignment] = useState(null);
  const [error, setError] = useState("");
  const [studentName, setStudentName] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`${API}/assignments/student/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setAssignment(data);
          setPhase("name");
        } else {
          setError(data.error || "Tarea no encontrada o inactiva");
          setPhase("error");
        }
      })
      .catch(() => {
        setError("No se pudo cargar la tarea. Verifica el enlace.");
        setPhase("error");
      });
  }, [token]);

  const handleStart = () => {
    if (!studentName.trim()) return;
    setPhase("quiz");
  };

  const currentAnswer = answers[currentIdx];
  const q = assignment?.questions[currentIdx];

  const canAdvance = () => {
    if (!q) return false;
    const type = q.type || "single";
    if (["poll", "scale"].includes(type)) return currentAnswer != null;
    if (type === "multi") return Array.isArray(currentAnswer) && currentAnswer.length > 0;
    return currentAnswer != null && currentAnswer !== "";
  };

  const handleNext = () => {
    if (currentIdx < assignment.questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    let score = 0;
    let totalPossible = 0;
    const answersArr = assignment.questions.map((question, i) => {
      const given = answers[i];
      const pts = question.points || 100;
      const isScored = !["poll", "scale"].includes(question.type || "single");
      if (isScored) totalPossible += pts;
      const correct = gradeAnswer(question, given);
      if (correct) score += pts;
      return { question: question.question, given, correct };
    });

    try {
      const res = await fetch(`${API}/assignments/student/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: studentName.trim(),
          score,
          total_possible: totalPossible,
          answers: answersArr,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ score, total: totalPossible });
        setPhase("done");
      } else {
        setError(data.error || "Error al enviar respuestas");
        setPhase("error");
      }
    } catch {
      setError("Error al enviar respuestas. Intenta de nuevo.");
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "loading") {
    return (
      <div className="sa-page sa-page--center">
        <div className="sa-spinner" aria-label="Cargando tarea..." />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="sa-page sa-page--center">
        <div className="sa-error-card">
          <AlertCircle size={40} className="sa-error-icon" />
          <h2 className="sa-error-title">Ups</h2>
          <p className="sa-error-text">{error}</p>
        </div>
      </div>
    );
  }

  if (phase === "name") {
    return (
      <div className="sa-page sa-page--center">
        <motion.div
          className="sa-name-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="sa-card-icon">
            <BookOpen size={28} />
          </div>
          <h1 className="sa-title">{assignment.title}</h1>
          <p className="sa-subtitle">
            {assignment.questions.length} {assignment.questions.length === 1 ? "pregunta" : "preguntas"} · Complétala a tu propio ritmo
          </p>
          <div className="sa-name-form">
            <label className="sa-label" htmlFor="sa-name-input">
              <User size={16} />
              <span>Tu nombre completo</span>
            </label>
            <input
              id="sa-name-input"
              className="sa-input"
              placeholder="Escribe tu nombre..."
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              maxLength={50}
              autoFocus
            />
            <button
              className="sa-btn-start"
              onClick={handleStart}
              disabled={!studentName.trim()}
            >
              Comenzar tarea
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === "quiz") {
    const total = assignment.questions.length;
    const progress = ((currentIdx) / total) * 100;

    return (
      <div className="sa-page sa-page--quiz">
        {/* Header */}
        <div className="sa-quiz-header">
          <img src="/logo.svg" alt="CYRAQuiz" className="sa-logo" />
          <span className="sa-quiz-name">{studentName}</span>
        </div>

        {/* Progress */}
        <div className="sa-progress-bar">
          <div className="sa-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="sa-progress-text">
          Pregunta {currentIdx + 1} de {total}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            className="sa-question-card"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            <p className="sa-question-text">{q.question}</p>
            <QuestionView
              q={q}
              answer={currentAnswer}
              onChange={(val) => setAnswers((prev) => ({ ...prev, [currentIdx]: val }))}
            />
          </motion.div>
        </AnimatePresence>

        <button
          className="sa-btn-next"
          onClick={handleNext}
          disabled={!canAdvance() || submitting}
        >
          {submitting
            ? "Enviando..."
            : currentIdx < total - 1
            ? "Siguiente"
            : "Enviar respuestas"}
          {!submitting && <ChevronRight size={18} />}
        </button>
      </div>
    );
  }

  if (phase === "done") {
    const percentage = result.total > 0 ? Math.round((result.score / result.total) * 100) : null;
    return (
      <div className="sa-page sa-page--center">
        <motion.div
          className="sa-result-card"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="sa-result-icon">
            <CheckCircle size={48} />
          </div>
          <h2 className="sa-result-title">¡Tarea completada!</h2>
          {result.total > 0 ? (
            <>
              <div className="sa-result-score">{result.score} / {result.total}</div>
              <div className="sa-result-pct">{percentage}% correcto</div>
            </>
          ) : (
            <p className="sa-result-subtitle">Tus respuestas fueron registradas correctamente.</p>
          )}
          <p className="sa-result-name">Entregado por: <strong>{studentName}</strong></p>
          <div className="sa-result-actions">
            <button className="sa-btn-join" onClick={() => navigate("/join")}>
              <Home size={16} />
              <span>Unirme a un juego en vivo</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
