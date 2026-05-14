import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Save, Play, Clock, Trophy, ChevronDown,
  Trash2, Plus, Check, FileQuestion,
  X, List, Layers, ToggleLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import { Toast } from "../components/common/Toast";
import { Spinner } from "../components/common/Spinner";
import "../styles/EditQuiz.css";

/* ─── Dropdown options ────────────────────────────────── */
const TYPE_OPTIONS = [
  { value: "single", label: "Selección simple",   desc: "1 respuesta",        icon: <List size={13} /> },
  { value: "multi",  label: "Selección múltiple", desc: "Varias respuestas",  icon: <Layers size={13} /> },
  { value: "tf",     label: "Verdadero / Falso",  desc: "Binaria",            icon: <ToggleLeft size={13} /> },
];

const TIME_OPTIONS = [
  { value: 10,  label: "10 seg" },
  { value: 20,  label: "20 seg" },
  { value: 30,  label: "30 seg" },
  { value: 60,  label: "1 min" },
  { value: 90,  label: "1 min 30 s" },
  { value: 120, label: "2 min" },
  { value: 150, label: "2 min 30 s" },
  { value: 180, label: "3 min" },
  { value: 240, label: "4 min" },
  { value: 300, label: "5 min" },
];

const POINTS_OPTIONS = [
  { value: 50,  label: "50 pts" },
  { value: 100, label: "100 pts" },
  { value: 200, label: "200 pts" },
  { value: 300, label: "300 pts" },
  { value: 400, label: "400 pts" },
  { value: 500, label: "500 pts" },
];

/* ─── CustomDropdown ──────────────────────────────────── */
const CustomDropdown = ({ value, options, onChange, icon, ariaLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleTriggerKey = (e) => {
    if (e.key === "Escape") setIsOpen(false);
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsOpen(o => !o); }
  };

  const selectOption = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="eq-dropdown">
      <button
        type="button"
        className={`eq-dropdown-trigger${isOpen ? " eq-dropdown-trigger--open" : ""}`}
        onClick={() => setIsOpen(o => !o)}
        onKeyDown={handleTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel ? `${ariaLabel}: ${selectedOption.label}` : selectedOption.label}
      >
        {icon && <span className="eq-dropdown-icon" aria-hidden="true">{icon}</span>}
        <span className="eq-dropdown-label">{selectedOption.label}</span>
        <ChevronDown
          size={12}
          className={`eq-dropdown-arrow${isOpen ? " eq-dropdown-arrow--open" : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            className="eq-dropdown-list"
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
          >
            {options.map(opt => (
              <li
                key={opt.value}
                role="option"
                aria-selected={value === opt.value}
                tabIndex={0}
                className={`eq-dropdown-option${value === opt.value ? " eq-dropdown-option--selected" : ""}`}
                onClick={() => selectOption(opt.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectOption(opt.value); }
                  if (e.key === "Escape") setIsOpen(false);
                }}
              >
                <span className="eq-dropdown-check" aria-hidden="true">
                  {value === opt.value && <Check size={11} />}
                </span>
                <span className="eq-dropdown-option-body">
                  <span className="eq-dropdown-option-label">{opt.label}</span>
                  {opt.desc && <span className="eq-dropdown-option-desc">{opt.desc}</span>}
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Main component ──────────────────────────────────── */
export default function EditQuiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();

  const initialData = location.state?.quizData;

  const [currentId, setCurrentId]           = useState(initialData?.id ?? null);
  const [quizTitle, setQuizTitle]           = useState(initialData?.title || "Nuevo Quiz");
  const [questions, setQuestions]           = useState(() => {
    const raw = initialData?.questions ?? initialData?.questionsData ?? [];
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return Array.isArray(raw) ? raw : [];
  });
  const [isSaving, setIsSaving]             = useState(false);
  const [isStarting, setIsStarting]         = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState(null);
  const [toast, setToast]                   = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  /* ── Question handlers ── */
  const handleQuestionTextChange = (index, newText) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], question: newText };
      return updated;
    });
  };

  const handleOptionChange = (qIndex, optIndex, newText) => {
    setQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[qIndex], options: [...updated[qIndex].options] };
      const oldText = q.options[optIndex];
      q.options[optIndex] = newText;
      if (q.type === "multi") {
        if (Array.isArray(q.answer) && q.answer.includes(oldText)) {
          q.answer = q.answer.map(a => a === oldText ? newText : a);
        }
      } else {
        if (q.answer === oldText) q.answer = newText;
      }
      updated[qIndex] = q;
      return updated;
    });
  };

  const handleChangeType = (qIndex, newType) => {
    setQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[qIndex] };
      q.type = newType;
      if (newType === "tf") {
        q.options = ["Verdadero", "Falso"];
        q.answer = "Verdadero";
      } else if (newType === "single") {
        if (q.options.length === 2) q.options = ["Opción 1", "Opción 2", "Opción 3", "Opción 4"];
        q.answer = q.options[0];
      } else if (newType === "multi") {
        if (q.options.length === 2) q.options = ["Opción 1", "Opción 2", "Opción 3", "Opción 4"];
        q.answer = [q.options[0], q.options[1]];
      }
      updated[qIndex] = q;
      return updated;
    });
  };

  const toggleCorrectAnswer = (qIndex, optText) => {
    setQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[qIndex] };
      if (q.type === "multi") {
        let answers = Array.isArray(q.answer) ? [...q.answer] : [q.answer];
        if (answers.includes(optText)) {
          if (answers.length > 1) answers = answers.filter(a => a !== optText);
        } else {
          if (answers.length < 2) {
            answers.push(optText);
          } else {
            showToast("Máximo 2 respuestas correctas en selección múltiple", "error");
            return prev;
          }
        }
        q.answer = answers;
      } else {
        q.answer = optText;
      }
      updated[qIndex] = q;
      return updated;
    });
  };

  const handleConfigChange = (index, field, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        type: "single",
        question: "",
        options: ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
        answer: "Opción 1",
        time: 20,
        points: 100,
      },
    ]);
  };

  const handleDeleteQuestion = (index) => {
    setPendingDeleteIndex(null);
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  /* ── Save / Start ── */
  const saveToBackend = async () => {
    if (!isLoggedIn()) {
      showToast("Debes iniciar sesión para guardar", "error");
      return false;
    }
    try {
      const isHugeId = currentId && currentId > 2147483647;
      const isEditing = currentId && !isHugeId;
      const path = isEditing ? `/quizzes/${currentId}` : "/quizzes";
      const res = await apiFetch(path, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify({
          title: quizTitle,
          questions,
          description: "Creado/Editado en CYRAQuiz",
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        if (!isEditing) setCurrentId(saved.id);
        return true;
      }
      const raw = await res.json();
      const msg = typeof raw === "string" ? raw : (raw.message || raw.error || "Error al guardar");
      if (res.status === 403) {
        showToast("Sesión expirada. Vuelve a iniciar sesión.", "error");
        setTimeout(() => navigate("/"), 2000);
      } else {
        showToast(msg, "error");
      }
      return false;
    } catch {
      showToast("Error de conexión con el servidor", "error");
      return false;
    }
  };

  const handleSaveOnly = async () => {
    setIsSaving(true);
    const ok = await saveToBackend();
    setIsSaving(false);
    if (ok) showToast("Cambios guardados correctamente");
  };

  const handleStartQuiz = async () => {
    setIsStarting(true);
    const ok = await saveToBackend();
    setIsStarting(false);
    if (!ok) return;
    navigate(`/room/${currentId}`, {
      state: {
        quizData: {
          ...(initialData || {}),
          id: currentId,
          title: quizTitle,
          questions,
          questionsData: questions,
        },
      },
    });
  };

  /* ── Motion ── */
  const cardVariants = {
    hidden:  { opacity: 0, y: 18 },
    visible: (i) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.05, duration: 0.24, ease: [0.22, 1, 0.36, 1] },
    }),
    exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
  };

  /* ── Render ── */
  return (
    <div className="eq-page">

      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
            classPrefix="eq-toast"
          />
        )}
      </AnimatePresence>

      {/* ─ Navbar ─ */}
      <nav className="eq-nav" role="navigation" aria-label="Editor de examen">
        <div className="eq-nav-inner">

          <div className="eq-nav-left">
            <button
              className="eq-btn-back"
              onClick={() => navigate("/host")}
              aria-label="Volver a mis exámenes"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              <span>Mis exámenes</span>
            </button>
            <div className="eq-nav-divider" aria-hidden="true" />
            <div className="eq-nav-meta">
              <span className="eq-nav-label">Editor de examen</span>
              {questions.length > 0 && (
                <span
                  className="eq-nav-count"
                  aria-label={`${questions.length} ${questions.length === 1 ? "pregunta" : "preguntas"}`}
                >
                  {questions.length}
                </span>
              )}
            </div>
          </div>

          <div className="eq-nav-right">
            <button
              className="eq-btn-save"
              onClick={handleSaveOnly}
              disabled={isSaving}
              aria-label="Guardar cambios"
            >
              {isSaving
                ? <><Spinner className="eq-spinner" /><span>Guardando...</span></>
                : <><Save size={14} aria-hidden="true" /><span>Guardar</span></>}
            </button>
            <button
              className="eq-btn-start"
              onClick={handleStartQuiz}
              disabled={questions.length === 0 || isStarting}
              aria-label={
                questions.length === 0
                  ? "Agrega preguntas para iniciar"
                  : "Guardar e iniciar quiz"
              }
            >
              {isStarting
                ? <><Spinner className="eq-spinner" /><span>Iniciando...</span></>
                : <><Play size={13} fill="currentColor" aria-hidden="true" /><span>Iniciar quiz</span></>}
            </button>
          </div>

        </div>
      </nav>

      {/* ─ Content ─ */}
      <main className="eq-main" id="main-content">

        {/* Title card */}
        <div className="eq-title-card">
          <label htmlFor="quiz-title" className="eq-title-label">
            Título del examen
          </label>
          <input
            id="quiz-title"
            type="text"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="Escribe el título aquí..."
            className="eq-title-input"
            maxLength={120}
          />
        </div>

        {/* Empty state */}
        {questions.length === 0 && (
          <motion.div
            className="eq-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="eq-empty-icon" aria-hidden="true">
              <FileQuestion size={36} />
            </div>
            <p className="eq-empty-title">Sin preguntas aún</p>
            <p className="eq-empty-text">
              Agrega preguntas para construir tu examen
            </p>
            <button className="eq-btn-add-primary" onClick={handleAddQuestion}>
              <Plus size={16} aria-hidden="true" />
              <span>Agregar primera pregunta</span>
            </button>
          </motion.div>
        )}

        {/* Question cards */}
        <AnimatePresence mode="popLayout">
          {questions.map((q, qIndex) => {
            const isPendingDelete = pendingDeleteIndex === qIndex;
            return (
              <motion.div
                key={qIndex}
                className="eq-question-card"
                custom={qIndex}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                {/* Toolbar */}
                <div className="eq-card-toolbar">
                  <div className="eq-toolbar-left">
                    <span
                      className="eq-question-badge"
                      aria-label={`Pregunta ${qIndex + 1}`}
                    >
                      {qIndex + 1}
                    </span>
                    <CustomDropdown
                      value={q.type || "single"}
                      options={TYPE_OPTIONS}
                      onChange={(val) => handleChangeType(qIndex, val)}
                      ariaLabel="Tipo de pregunta"
                    />
                  </div>
                  <div className="eq-toolbar-right">
                    <CustomDropdown
                      icon={<Clock size={12} />}
                      value={q.time || 20}
                      options={TIME_OPTIONS}
                      onChange={(val) => handleConfigChange(qIndex, "time", Number(val))}
                      ariaLabel="Tiempo límite"
                    />
                    <CustomDropdown
                      icon={<Trophy size={12} />}
                      value={q.points || 100}
                      options={POINTS_OPTIONS}
                      onChange={(val) => handleConfigChange(qIndex, "points", Number(val))}
                      ariaLabel="Puntos"
                    />
                    <button
                      className={`eq-btn-delete${isPendingDelete ? " eq-btn-delete--active" : ""}`}
                      onClick={() => setPendingDeleteIndex(isPendingDelete ? null : qIndex)}
                      aria-label={isPendingDelete ? "Cancelar" : `Eliminar pregunta ${qIndex + 1}`}
                      aria-expanded={isPendingDelete}
                    >
                      {isPendingDelete
                        ? <X size={14} aria-hidden="true" />
                        : <Trash2 size={14} aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {/* Inline delete confirmation */}
                <AnimatePresence>
                  {isPendingDelete && (
                    <motion.div
                      className="eq-delete-confirm"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: "hidden" }}
                      role="alert"
                    >
                      <div className="eq-delete-confirm-inner">
                        <span className="eq-delete-confirm-text">
                          ¿Eliminar la pregunta {qIndex + 1}?
                        </span>
                        <div className="eq-delete-confirm-actions">
                          <button
                            className="eq-btn-confirm-cancel"
                            onClick={() => setPendingDeleteIndex(null)}
                          >
                            Cancelar
                          </button>
                          <button
                            className="eq-btn-confirm-delete"
                            onClick={() => handleDeleteQuestion(qIndex)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Body */}
                <div className="eq-card-body">

                  {/* Question text */}
                  <div className="eq-question-input-wrap">
                    <label
                      htmlFor={`q-${qIndex}-text`}
                      className="eq-sr-only"
                    >
                      Texto de la pregunta {qIndex + 1}
                    </label>
                    <textarea
                      id={`q-${qIndex}-text`}
                      value={q.question}
                      onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                      placeholder="Escribe la pregunta aquí..."
                      rows={2}
                      className="eq-question-textarea"
                    />
                    <div className="eq-underline" aria-hidden="true" />
                  </div>

                  {/* Options grid */}
                  <fieldset className="eq-options-grid">
                    <legend className="eq-sr-only">Opciones de respuesta</legend>
                    {q.options && q.options.map((opt, optIndex) => {
                      const isCorrect = Array.isArray(q.answer)
                        ? q.answer.includes(opt)
                        : q.answer === opt;
                      return (
                        <div
                          key={optIndex}
                          className={`eq-option${isCorrect ? " eq-option--correct" : ""}`}
                        >
                          <button
                            type="button"
                            className="eq-option-check"
                            onClick={() => toggleCorrectAnswer(qIndex, opt)}
                            aria-label={`${isCorrect ? "Quitar como" : "Marcar como"} respuesta correcta`}
                            aria-pressed={isCorrect}
                          >
                            {isCorrect && <Check size={12} aria-hidden="true" />}
                          </button>
                          <label
                            htmlFor={`q-${qIndex}-opt-${optIndex}`}
                            className="eq-sr-only"
                          >
                            Opción {optIndex + 1}
                          </label>
                          <input
                            id={`q-${qIndex}-opt-${optIndex}`}
                            type="text"
                            value={opt}
                            readOnly={q.type === "tf"}
                            onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                            placeholder={`Opción ${optIndex + 1}`}
                            className="eq-option-input"
                            aria-readonly={q.type === "tf" ? "true" : undefined}
                          />
                        </div>
                      );
                    })}
                  </fieldset>

                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add question — only visible when there are already questions */}
        {questions.length > 0 && (
          <div className="eq-add-wrapper">
            <button className="eq-btn-add" onClick={handleAddQuestion}>
              <Plus size={16} aria-hidden="true" />
              <span>Nueva pregunta</span>
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
