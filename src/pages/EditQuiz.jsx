import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Save, Play, Clock, Trophy, ChevronDown,
  Trash2, Plus, Check, FileQuestion, Copy, GripVertical,
  X, List, Layers, ToggleLeft,
  BarChart2, Star, AlignLeft, SlidersHorizontal, ImageIcon, Pencil, Sparkles,
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
import { apiFetch, apiUpload } from "../utils/api";
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
  { value: "draw",    label: "Dibujo libre",         desc: "Canvas táctil",      icon: <Pencil size={13} /> },
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

/* ─── Video helpers ───────────────────────────────────── */
function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
function secsToMmss(secs) {
  if (secs == null || secs === "") return "";
  const n = Number(secs);
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
function mmssToSecs(str) {
  if (!str) return null;
  const parts = str.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + (parts[1] || 0);
  return Number(parts[0]) || 0;
}

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

/* ─── SortableCard ────────────────────────────────────── */
function SortableCard({ id, children, custom, variants, initial, animate, exit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <motion.div
      ref={setNodeRef}
      className={`eq-question-card${isDragging ? " eq-question-card--dragging" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      custom={custom}
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
    >
      {children({ listeners, attributes })}
    </motion.div>
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
  const [videoUrl, setVideoUrl]             = useState(initialData?.video_url || "");
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

  // AI generation panel
  const [aiOpen,     setAiOpen]     = useState(false);
  const [aiMode,     setAiMode]     = useState("topic");
  const [aiInput,    setAiInput]    = useState("");
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiPreview,  setAiPreview]  = useState([]);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState(null);
  const [toast, setToast]                   = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  /* ── Image upload ── */
  const [uploadingIndex, setUploadingIndex] = useState(null);

  const handleImageUpload = async (qIndex, file) => {
    if (!file) return;
    setUploadingIndex(qIndex);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await apiUpload("/upload-image", fd);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Error al subir imagen", "error");
        return;
      }
      const { url } = await res.json();
      setQuestions(prev => {
        const updated = [...prev];
        updated[qIndex] = { ...updated[qIndex], image: url };
        return updated;
      });
    } catch (err) {
      console.error("[EditQuiz] uploadImage:", err);
      showToast("Error de red al subir imagen", "error");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemoveImage = (qIndex) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], image: null };
      return updated;
    });
  };

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
      } else if (newType === "draw") {
        q.options = [];
        q.answer = "__draw__";
        q.points = 0;
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
        image: null,
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

  /* ── AI generation ── */
  const handleAiGenerate = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiPreview([]);
    try {
      const res = await apiFetch("/generate-text", {
        method: "POST",
        body: JSON.stringify({ mode: aiMode, content: aiInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Error generando preguntas", "error"); return; }
      const withUids = (data.questions || []).map(q => ({ ...q, _uid: crypto.randomUUID() }));
      setAiPreview(withUids);
      if (!withUids.length) showToast("La IA no generó preguntas. Intenta con más texto.", "error");
    } catch {
      showToast("Error de conexión con el servidor", "error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiAddAll = () => {
    setQuestions(prev => [...prev, ...aiPreview]);
    setAiPreview([]);
    setAiInput("");
    setAiOpen(false);
    showToast(`${aiPreview.length} preguntas agregadas al quiz`);
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
          videoUrl: videoUrl || null,
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
    } catch (err) {
      console.error("[EditQuiz] saveQuiz:", err);
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
          video_url: videoUrl || null,
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
              className="eq-btn-ai"
              onClick={() => { setAiOpen(v => !v); setAiPreview([]); }}
              aria-label="Generar preguntas con IA"
            >
              <Sparkles size={14} aria-hidden="true" />
              <span>IA</span>
            </button>
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

        {/* Video Quiz URL */}
        <div className="eq-video-bar">
          <span className="eq-video-icon" aria-hidden="true">🎬</span>
          <div className="eq-video-input-wrap">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="URL de YouTube (opcional) — convierte el quiz en Video Quiz"
              className="eq-video-url-input"
              aria-label="URL del video de YouTube"
            />
            {videoUrl && extractYouTubeId(videoUrl) && (
              <span className="eq-video-status eq-video-status--ok">✓ Video detectado</span>
            )}
            {videoUrl && !extractYouTubeId(videoUrl) && (
              <span className="eq-video-status eq-video-status--err">URL de YouTube no válida</span>
            )}
          </div>
          {videoUrl && (
            <button
              type="button"
              className="eq-video-clear"
              onClick={() => setVideoUrl("")}
              aria-label="Quitar video"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ─ AI Generation panel ─────────────────────── */}
        <AnimatePresence>
          {aiOpen && (
            <motion.div
              className="eq-ai-panel"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0,   scale: 1    }}
              exit={{    opacity: 0, y: -8,  scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="eq-ai-panel-header">
                <Sparkles size={15} className="eq-ai-icon" aria-hidden="true" />
                <span className="eq-ai-title">Generar preguntas con IA</span>
                <button className="eq-ai-close" onClick={() => setAiOpen(false)} aria-label="Cerrar panel IA">
                  <X size={14} />
                </button>
              </div>

              {/* Mode tabs */}
              <div className="eq-ai-tabs" role="tablist">
                {[
                  { id: "topic", label: "Tema" },
                  { id: "text",  label: "Texto" },
                  { id: "url",   label: "URL"   },
                ].map(tab => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={aiMode === tab.id}
                    className={`eq-ai-tab${aiMode === tab.id ? " eq-ai-tab--active" : ""}`}
                    onClick={() => { setAiMode(tab.id); setAiPreview([]); }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Input */}
              {aiMode === "url" ? (
                <input
                  type="url"
                  className="eq-ai-input"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  placeholder="https://..."
                  aria-label="URL de la que extraer preguntas"
                />
              ) : aiMode === "topic" ? (
                <input
                  type="text"
                  className="eq-ai-input"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  placeholder="Ej: Revolución Francesa, tabla periódica, fotosíntesis..."
                  onKeyDown={e => e.key === "Enter" && handleAiGenerate()}
                  aria-label="Tema para generar preguntas"
                />
              ) : (
                <textarea
                  className="eq-ai-textarea"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  placeholder="Pega aquí tus apuntes, el capítulo del libro, o cualquier texto..."
                  rows={4}
                  aria-label="Texto del que extraer preguntas"
                />
              )}

              <button
                className="eq-ai-generate-btn"
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiInput.trim()}
              >
                {aiLoading ? (
                  <><Spinner className="eq-spinner" /><span>Generando...</span></>
                ) : (
                  <><Sparkles size={14} /><span>Generar preguntas</span></>
                )}
              </button>

              {/* Preview */}
              {aiPreview.length > 0 && (
                <div className="eq-ai-preview">
                  <div className="eq-ai-preview-header">
                    <span className="eq-ai-preview-count">{aiPreview.length} preguntas generadas</span>
                    <button className="eq-ai-add-btn" onClick={handleAiAddAll}>
                      <Plus size={13} /> Agregar todas al quiz
                    </button>
                  </div>
                  <ul className="eq-ai-preview-list">
                    {aiPreview.map((q, i) => (
                      <li key={q._uid} className="eq-ai-preview-item">
                        <span className="eq-ai-preview-num">{i + 1}</span>
                        <span className="eq-ai-preview-q">{q.question}</span>
                        <span className="eq-ai-preview-type">{q.type}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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
              <SortableCard
                key={q._uid}
                id={q._uid}
                custom={qIndex}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {({ listeners, attributes }) => (<>
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

                  {/* Image upload */}
                  <div className="eq-image-area">
                    {q.image ? (
                      <div className="eq-image-preview">
                        <img src={q.image} alt="Imagen de la pregunta" className="eq-image-thumb" />
                        <button
                          type="button"
                          className="eq-image-remove"
                          onClick={() => handleRemoveImage(qIndex)}
                          aria-label="Eliminar imagen"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className={`eq-image-upload${uploadingIndex === qIndex ? " eq-image-upload--loading" : ""}`}>
                        {uploadingIndex === qIndex ? (
                          <span className="eq-image-spinner" aria-hidden="true" />
                        ) : (
                          <ImageIcon size={15} aria-hidden="true" />
                        )}
                        <span>{uploadingIndex === qIndex ? "Subiendo..." : "Añadir imagen"}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="eq-sr-only"
                          disabled={uploadingIndex !== null}
                          onChange={e => handleImageUpload(qIndex, e.target.files?.[0])}
                        />
                      </label>
                    )}
                  </div>

                  {/* Timestamp — solo visible en Video Quiz */}
                  {videoUrl && extractYouTubeId(videoUrl) && (
                    <div className="eq-timestamp-wrap">
                      <label
                        htmlFor={`q-${qIndex}-ts`}
                        className="eq-timestamp-label"
                      >
                        ⏱ Aparece en:
                      </label>
                      <input
                        id={`q-${qIndex}-ts`}
                        type="text"
                        className="eq-timestamp-input"
                        value={secsToMmss(q.timestamp)}
                        onChange={(e) => {
                          const secs = mmssToSecs(e.target.value);
                          handleConfigChange(qIndex, "timestamp", secs);
                        }}
                        placeholder="1:30"
                        aria-label={`Momento del video para la pregunta ${qIndex + 1} (MM:SS)`}
                      />
                    </div>
                  )}

                  {/* Difficulty selector */}
                  <div className="eq-difficulty-row">
                    <span className="eq-difficulty-label">Dificultad:</span>
                    {[
                      { id: "easy",   emoji: "🟢", label: "Fácil"   },
                      { id: "medium", emoji: "🟡", label: "Media"   },
                      { id: "hard",   emoji: "🔴", label: "Difícil" },
                    ].map(d => (
                      <button
                        key={d.id}
                        type="button"
                        className={`eq-difficulty-btn eq-difficulty-btn--${d.id}${(q.difficulty || "medium") === d.id ? " eq-difficulty-btn--active" : ""}`}
                        onClick={() => handleConfigChange(qIndex, "difficulty", d.id)}
                        aria-pressed={(q.difficulty || "medium") === d.id}
                      >
                        {d.emoji} {d.label}
                      </button>
                    ))}
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

                  {/* === draw → canvas note === */}
                  {q.type === "draw" && (
                    <div className="eq-draw-note">
                      <Pencil size={14} aria-hidden="true" />
                      <p>Los estudiantes dibujan en un lienzo táctil. Sin corrección automática — los dibujos aparecen en pantalla del profesor al revelar.</p>
                    </div>
                  )}

                </div>
                </>)}
              </SortableCard>
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
