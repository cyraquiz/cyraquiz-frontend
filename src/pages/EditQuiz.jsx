import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Save, Play, Clock, Trophy, ChevronDown,
  Trash2, Plus, Check, FileQuestion, Copy, GripVertical,
  X, List, Layers, ToggleLeft,
  BarChart2, Star, AlignLeft, SlidersHorizontal,
} from "lucide-react";
import {
  DndContext, closestCenter,
  PointerSensor, TouchSensor,
  useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import { Toast } from "../components/common/Toast";
import { Spinner } from "../components/common/Spinner";
import "../styles/EditQuiz.css";

/* ─── Dropdown options ────────────────────────────────── */
const TYPE_OPTIONS = [
  { value: "single",  label: "Selección simple",    desc: "1 respuesta",        icon: <List size={13} /> },
  { value: "multi",   label: "Selección múltiple",  desc: "Varias respuestas",  icon: <Layers size={13} /> },
  { value: "tf",      label: "Verdadero / Falso",   desc: "Binaria",            icon: <ToggleLeft size={13} /> },
  { value: "poll",    label: "Encuesta",            desc: "Sin puntos",         icon: <BarChart2 size={13} /> },
  { value: "scale",   label: "Escala 1–5",          desc: "Sin puntos",         icon: <Star size={13} /> },
  { value: "text",    label: "Respuesta escrita",   desc: "Texto libre",        icon: <AlignLeft size={13} /> },
  { value: "slider",  label: "Deslizador",          desc: "Rango numérico",     icon: <SlidersHorizontal size={13} /> },
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

/* ─── SortableQuestionCard ────────────────────────────── */
function SortableQuestionCard({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
    >
      {children({ listeners, attributes, isDragging })}
    </div>
  );
}

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
    let arr;
    if (typeof raw === "string") {
      try { arr = JSON.parse(raw); } catch { arr = []; }
    } else {
      arr = Array.isArray(raw) ? raw : [];
    }
    return arr.map(q => q._uid ? q : { ...q, _uid: crypto.randomUUID() });
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
        if (!q.options || q.options.length !== 4) q.options = ["Opción 1", "Opción 2", "Opción 3", "Opción 4"];
        q.answer = q.options[0];
      } else if (newType === "multi") {
        if (!q.options || q.options.length !== 4) q.options = ["Opción 1", "Opción 2", "Opción 3", "Opción 4"];
        q.answer = [q.options[0], q.options[1]];
      } else if (newType === "poll") {
        if (!q.options || q.options.length < 2) q.options = ["Opción A", "Opción B", "Opción C", "Opción D"];
        q.answer = "__poll__";
        q.points = 0;
      } else if (newType === "scale") {
        q.options = ["1", "2", "3", "4", "5"];
        q.answer = "__scale__";
        q.points = 0;
      } else if (newType === "text") {
        q.options = [];
        q.answer = "";
      } else if (newType === "slider") {
        q.options = [];
        q.answer = "50";
        q.min = 0;
        q.max = 100;
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
        _uid: crypto.randomUUID(),
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

  const handleDuplicateQuestion = (index) => {
    setQuestions(prev => {
      const src = prev[index];
      const copy = { ...src, options: [...(src.options || [])], _uid: crypto.randomUUID() };
      const updated = [...prev];
      updated.splice(index + 1, 0, copy);
      return updated;
    });
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
          questions: questions.map(({ _uid, ...q }) => q),
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
          questions: questions.map(({ _uid, ...q }) => q),
          questionsData: questions.map(({ _uid, ...q }) => q),
        },
      },
    });
  };

  /* ── Drag & drop ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setQuestions(prev => {
      const oldIndex = prev.findIndex(q => q._uid === active.id);
      const newIndex = prev.findIndex(q => q._uid === over.id);
      return arrayMove(prev, oldIndex, newIndex);
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={questions.map(q => q._uid)} strategy={verticalListSortingStrategy}>
        <AnimatePresence mode="popLayout">
          {questions.map((q, qIndex) => {
            const isPendingDelete = pendingDeleteIndex === qIndex;
            return (
              <SortableQuestionCard key={q._uid} id={q._uid}>
                {({ listeners, attributes, isDragging }) => (
              <motion.div
                className={`eq-question-card${isDragging ? " eq-question-card--dragging" : ""}`}
                custom={qIndex}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Toolbar */}
                <div className="eq-card-toolbar">
                  <div className="eq-toolbar-left">
                    <button
                      className="eq-btn-drag"
                      {...listeners}
                      {...attributes}
                      aria-label="Arrastrar para reordenar"
                    >
                      <GripVertical size={14} aria-hidden="true" />
                    </button>
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
                    {q.type === "poll" || q.type === "scale" ? (
                      <span className="eq-no-points-badge">Sin puntos</span>
                    ) : (
                      <CustomDropdown
                        icon={<Trophy size={12} />}
                        value={q.points || 100}
                        options={POINTS_OPTIONS}
                        onChange={(val) => handleConfigChange(qIndex, "points", Number(val))}
                        ariaLabel="Puntos"
                      />
                    )}
                    <button
                      className="eq-btn-duplicate"
                      onClick={() => handleDuplicateQuestion(qIndex)}
                      aria-label={`Duplicar pregunta ${qIndex + 1}`}
                    >
                      <Copy size={14} aria-hidden="true" />
                    </button>
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

                  {/* === single | multi | tf | poll → options grid === */}
                  {(!q.type || q.type === "single" || q.type === "multi" || q.type === "tf" || q.type === "poll") && (
                    <>
                      <fieldset className="eq-options-grid">
                        <legend className="eq-sr-only">Opciones de respuesta</legend>
                        {q.options && q.options.map((opt, optIndex) => {
                          const isCorrect = q.type === "poll"
                            ? false
                            : (Array.isArray(q.answer) ? q.answer.includes(opt) : q.answer === opt);
                          return (
                            <div
                              key={optIndex}
                              className={`eq-option${isCorrect ? " eq-option--correct" : ""}`}
                            >
                              {q.type === "poll" ? (
                                <span className="eq-option-poll-dot" aria-hidden="true" />
                              ) : (
                                <button
                                  type="button"
                                  className="eq-option-check"
                                  onClick={() => toggleCorrectAnswer(qIndex, opt)}
                                  aria-label={`${isCorrect ? "Quitar como" : "Marcar como"} respuesta correcta`}
                                  aria-pressed={isCorrect}
                                >
                                  {isCorrect && <Check size={12} aria-hidden="true" />}
                                </button>
                              )}
                              <label htmlFor={`q-${qIndex}-opt-${optIndex}`} className="eq-sr-only">
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
                      {q.type === "poll" && (
                        <p className="eq-type-note">
                          <BarChart2 size={12} aria-hidden="true" />
                          <span>Encuesta — sin respuesta correcta ni puntos</span>
                        </p>
                      )}
                    </>
                  )}

                  {/* === scale → static 1–5 preview === */}
                  {q.type === "scale" && (
                    <div className="eq-scale-preview">
                      <div className="eq-scale-preview-buttons">
                        {["1","2","3","4","5"].map(n => (
                          <div key={n} className="eq-scale-preview-btn">{n}</div>
                        ))}
                      </div>
                      <p className="eq-type-note">
                        <Star size={12} aria-hidden="true" />
                        <span>Escala de valoración — sin puntos</span>
                      </p>
                    </div>
                  )}

                  {/* === text → expected answer input === */}
                  {q.type === "text" && (
                    <div className="eq-answer-wrap">
                      <label htmlFor={`q-${qIndex}-answer`} className="eq-answer-label">
                        Respuesta esperada
                      </label>
                      <input
                        id={`q-${qIndex}-answer`}
                        type="text"
                        value={q.answer || ""}
                        onChange={(e) => handleConfigChange(qIndex, "answer", e.target.value)}
                        placeholder="Escribe la respuesta correcta exacta..."
                        className="eq-answer-input"
                        maxLength={120}
                        autoComplete="off"
                      />
                      <p className="eq-type-note">
                        <AlignLeft size={12} aria-hidden="true" />
                        <span>La comparación no distingue mayúsculas</span>
                      </p>
                    </div>
                  )}

                  {/* === slider → min / max / answer config === */}
                  {q.type === "slider" && (
                    <div className="eq-slider-config">
                      <div className="eq-slider-fields">
                        <div className="eq-slider-field">
                          <label htmlFor={`q-${qIndex}-min`} className="eq-slider-field-label">Mínimo</label>
                          <input
                            id={`q-${qIndex}-min`}
                            type="number"
                            value={q.min ?? 0}
                            onChange={(e) => handleConfigChange(qIndex, "min", Number(e.target.value))}
                            className="eq-slider-number"
                          />
                        </div>
                        <div className="eq-slider-field">
                          <label htmlFor={`q-${qIndex}-max`} className="eq-slider-field-label">Máximo</label>
                          <input
                            id={`q-${qIndex}-max`}
                            type="number"
                            value={q.max ?? 100}
                            onChange={(e) => handleConfigChange(qIndex, "max", Number(e.target.value))}
                            className="eq-slider-number"
                          />
                        </div>
                        <div className="eq-slider-field eq-slider-field--answer">
                          <label htmlFor={`q-${qIndex}-answer`} className="eq-slider-field-label">Respuesta correcta</label>
                          <input
                            id={`q-${qIndex}-answer`}
                            type="number"
                            value={q.answer || ""}
                            onChange={(e) => handleConfigChange(qIndex, "answer", e.target.value)}
                            className="eq-slider-number"
                            min={q.min ?? 0}
                            max={q.max ?? 100}
                          />
                        </div>
                      </div>
                      <div className="eq-slider-preview">
                        <span className="eq-slider-preview-val">{q.answer || 50}</span>
                        <input
                          type="range"
                          min={q.min ?? 0}
                          max={q.max ?? 100}
                          value={Number(q.answer) || 50}
                          onChange={(e) => handleConfigChange(qIndex, "answer", e.target.value)}
                          className="eq-slider-range"
                          aria-label="Vista previa del deslizador"
                        />
                        <div className="eq-slider-range-labels">
                          <span>{q.min ?? 0}</span>
                          <span>{q.max ?? 100}</span>
                        </div>
                      </div>
                      <p className="eq-type-note">
                        <SlidersHorizontal size={12} aria-hidden="true" />
                        <span>Solo la respuesta exacta otorga puntos</span>
                      </p>
                    </div>
                  )}

                </div>
              </motion.div>
                )}
              </SortableQuestionCard>
            );
          })}
        </AnimatePresence>
          </SortableContext>
        </DndContext>

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
