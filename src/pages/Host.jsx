import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Search, Plus, Play, Trash2, X,
  Upload, FileText, CheckCircle, LogOut,
  Sparkles, FileQuestion, AlertCircle, Pencil,
  Share2, ClipboardList, Copy, Check, Link2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch, apiUpload } from "../utils/api";
import { Toast } from "../components/common/Toast";
import { Spinner } from "../components/common/Spinner";
import "../styles/Host.css";

const QUIZZES_PER_PAGE = 12;

function SkeletonCard() {
  return (
    <div className="quiz-card quiz-card--skeleton" aria-hidden="true">
      <div className="quiz-card-header">
        <div className="skeleton-box skeleton-icon" />
      </div>
      <div className="quiz-card-body">
        <div className="skeleton-box skeleton-title" />
        <div className="skeleton-box skeleton-meta" />
      </div>
      <div className="quiz-card-footer">
        <div className="skeleton-box skeleton-btn" />
      </div>
    </div>
  );
}

export default function Host() {
  const navigate = useNavigate();
  const { logout, getUser } = useAuth();
  const userEmail = getUser().email || "Profesor";

  const [myQuizzes, setMyQuizzes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isExtractMode, setIsExtractMode] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState(null);
  const searchRef = useRef(null);

  // AI modal — tab mode
  const [aiMode, setAiMode] = useState("pdf");
  const [textContent, setTextContent] = useState("");

  // Assignment modal
  const [assignmentQuiz, setAssignmentQuiz] = useState(null);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentLink, setAssignmentLink] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      showToast("Tu sesión ha expirado. Inicia sesión de nuevo.", "error");
      setTimeout(() => { logout(); navigate("/"); }, 2500);
    };
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, [showToast, logout, navigate]);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!getUser().token) { setIsFetching(false); return; }
      try {
        const res = await apiFetch("/quizzes");
        if (res.ok) {
          const data = await res.json();
          setMyQuizzes(
            data.map((q) => {
              const questions = typeof q.questions === "string"
                ? JSON.parse(q.questions)
                : (q.questions || []);
              return {
                id: q.id,
                title: q.title,
                date: new Date(q.created_at).toLocaleDateString("es-MX", {
                  day: "numeric", month: "short", year: "numeric",
                }),
                questions,
                totalQuestions: questions.length,
              };
            })
          );
        }
      } catch (err) {
        console.error("Error cargando quizzes:", err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchQuizzes();
  }, []);

  const filteredQuizzes = myQuizzes.filter((q) =>
    q.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredQuizzes.length / QUIZZES_PER_PAGE);
  const paginatedQuizzes = filteredQuizzes.slice(
    (currentPage - 1) * QUIZZES_PER_PAGE,
    currentPage * QUIZZES_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected?.type === "application/pdf") setFile(selected);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") setFile(dropped);
  };

  const closeModal = () => {
    setShowModal(false);
    setFile(null);
    setSuccessData(null);
    setIsExtractMode(false);
    setIsDragging(false);
    setAiMode("pdf");
    setTextContent("");
  };

  const handleGenerateText = async () => {
    if (!textContent.trim()) return;
    setLoading(true);
    try {
      const response = await apiFetch("/generate-text", {
        method: "POST",
        body: JSON.stringify({ mode: aiMode, content: textContent.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        let titleFallback = textContent.trim().slice(0, 50);
        if (aiMode === "url") {
          try { titleFallback = new URL(textContent.trim()).hostname; } catch {}
        }
        const newQuiz = {
          id: Date.now(),
          title: titleFallback,
          date: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
          questions: data.questions,
          totalQuestions: data.questions.length,
        };
        setMyQuizzes((prev) => [...prev, newQuiz]);
        setSuccessData(newQuiz);
      } else {
        showToast(data.error || "Error al generar preguntas con IA", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("No se pudo conectar con el servidor.", "error");
    } finally {
      setLoading(false);
    }
  };

  const closeAssignmentModal = () => {
    setAssignmentQuiz(null);
    setAssignmentTitle("");
    setAssignmentLink(null);
    setLinkCopied(false);
  };

  const handleCreateAssignment = async () => {
    if (!assignmentTitle.trim() || !assignmentQuiz) return;
    setAssignmentLoading(true);
    try {
      const res = await apiFetch("/assignments", {
        method: "POST",
        body: JSON.stringify({
          quiz_id: assignmentQuiz.id,
          title: assignmentTitle.trim(),
          questions: assignmentQuiz.questions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAssignmentLink(`${window.location.origin}/asignacion/${data.assignment.token}`);
      } else {
        showToast(data.error || "Error al crear tarea", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error al crear tarea", "error");
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("casillaMarcada", isExtractMode);
      formData.append("pdfFile", file);
      const response = await apiUpload("/upload", formData);
      const data = await response.json();
      if (data.success) {
        const newQuiz = {
          id: Date.now(),
          title: file.name.replace(".pdf", ""),
          date: new Date().toLocaleDateString("es-MX", {
            day: "numeric", month: "short", year: "numeric",
          }),
          questions: data.questions,
          totalQuestions: data.questions.length,
        };
        setMyQuizzes((prev) => [...prev, newQuiz]);
        setSuccessData(newQuiz);
      } else {
        showToast(data.error || "Error al generar preguntas con IA", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("No se pudo conectar con el servidor. Verifica que el backend esté activo.", "error");
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!quizToDelete) return;
    try {
      const res = await apiFetch(`/quizzes/${quizToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setMyQuizzes((prev) => prev.filter((q) => q.id !== quizToDelete));
        setQuizToDelete(null);
        showToast("Examen eliminado correctamente");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.96, y: 16 },
    visible: {
      opacity: 1, scale: 1, y: 0,
      transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
    },
    exit: { opacity: 0, scale: 0.96, y: 16, transition: { duration: 0.16 } },
  };

  return (
    <div className="host-page">

      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
            classPrefix="host-toast"
          />
        )}
      </AnimatePresence>

      <nav className="host-nav" role="navigation" aria-label="Navegación principal">
        <div className="host-nav-inner">
          <img
            src="/logo.svg"
            alt="CYRAQuiz — ir al inicio"
            className="host-nav-logo"
            onClick={() => navigate("/")}
          />
          <div className="host-nav-user">
            <span className="host-nav-email" title={userEmail}>
              {userEmail}
            </span>
            <button
              className="host-nav-logout"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="host-main" id="main-content">

        <div className="host-header">
          <div className="host-header-text">
            <p className="host-eyebrow">Centro de mando</p>
            <h1 className="host-title">Mis exámenes</h1>
            <p className="host-subtitle">
              {isFetching
                ? "Cargando exámenes..."
                : myQuizzes.length > 0
                  ? `${myQuizzes.length} ${myQuizzes.length === 1 ? "examen listo" : "exámenes listos"}`
                  : "Crea tu primer examen para comenzar"}
            </p>
          </div>

          <div className="host-toolbar">
            <div className="host-search-wrapper">
              <Search size={16} className="host-search-icon" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                placeholder="Buscar examen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="host-search-input"
                aria-label="Buscar examen"
              />
              <AnimatePresence>
                {searchTerm && (
                  <motion.button
                    className="host-search-clear"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => { setSearchTerm(""); searchRef.current?.focus(); }}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={12} aria-hidden="true" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <button
              className="host-btn-assignments"
              onClick={() => navigate("/tareas")}
              aria-label="Ver mis tareas"
            >
              <ClipboardList size={17} aria-hidden="true" />
              <span>Mis Tareas</span>
            </button>
            <button
              className="host-btn-ai"
              onClick={() => setShowModal(true)}
              aria-label="Crear examen con inteligencia artificial"
            >
              <Sparkles size={17} aria-hidden="true" />
              <span>Crear con IA</span>
            </button>
            <button
              className="host-btn-new"
              onClick={() => navigate("/edit/new")}
              aria-label="Crear nuevo examen manualmente"
            >
              <Plus size={17} aria-hidden="true" />
              <span>Nuevo</span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {isFetching ? (
            <div className="host-grid" aria-label="Cargando exámenes..." aria-busy="true">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <motion.div
              className="host-empty"
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="region"
              aria-label="Sin exámenes"
            >
              <div className="host-empty-icon" aria-hidden="true">
                <FileQuestion size={36} />
              </div>
              <p className="host-empty-title">
                {searchTerm ? "Sin resultados" : "Sin exámenes aún"}
              </p>
              <p className="host-empty-text">
                {searchTerm
                  ? `No encontramos exámenes con "${searchTerm}"`
                  : "Crea un examen manualmente o genera uno desde un PDF con IA"}
              </p>
              {!searchTerm && (
                <div className="host-empty-actions">
                  <button className="host-btn-new host-empty-btn" onClick={() => navigate("/edit/new")}>
                    <Plus size={16} aria-hidden="true" />
                    <span>Crear examen</span>
                  </button>
                  <button className="host-btn-ai host-empty-btn" onClick={() => setShowModal(true)}>
                    <Sparkles size={16} aria-hidden="true" />
                    <span>Crear con IA</span>
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <>
              <motion.div
                className="host-grid"
                layout
                aria-label={`${paginatedQuizzes.length} exámenes`}
              >
                {paginatedQuizzes.map((quiz, i) => (
                  <motion.article
                    key={quiz.id}
                    className="quiz-card"
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    aria-label={`Examen: ${quiz.title}, ${quiz.totalQuestions} preguntas`}
                  >
                    <div className="quiz-card-header">
                      <div className="quiz-card-icon" aria-hidden="true">
                        <BookOpen size={18} />
                      </div>
                      <button
                        className="quiz-card-delete"
                        onClick={(e) => { e.stopPropagation(); setQuizToDelete(quiz.id); }}
                        aria-label={`Eliminar examen: ${quiz.title}`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="quiz-card-body">
                      <h3 className="quiz-card-title">{quiz.title}</h3>
                      <div className="quiz-card-meta">
                        <span className="quiz-card-count">
                          <span className="quiz-card-count-badge" aria-hidden="true">
                            {quiz.totalQuestions}
                          </span>
                          {quiz.totalQuestions === 1 ? " pregunta" : " preguntas"}
                        </span>
                        <span className="quiz-card-date">{quiz.date}</span>
                      </div>
                    </div>

                    <div className="quiz-card-footer">
                      <button
                        className="quiz-card-edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/edit/${quiz.id}`, { state: { quizData: quiz } });
                        }}
                        aria-label={`Editar examen: ${quiz.title}`}
                      >
                        <Pencil size={13} aria-hidden="true" />
                        <span>Editar</span>
                      </button>
                      <button
                        className="quiz-card-share"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssignmentQuiz(quiz);
                          setAssignmentTitle(quiz.title);
                          setAssignmentLink(null);
                          setLinkCopied(false);
                        }}
                        aria-label={`Compartir como tarea: ${quiz.title}`}
                        title="Compartir como tarea"
                      >
                        <Share2 size={13} aria-hidden="true" />
                      </button>
                      <button
                        className="quiz-card-play"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/room/${quiz.id}`, { state: { quizData: quiz } });
                        }}
                        aria-label={`Iniciar juego con: ${quiz.title}`}
                      >
                        <Play size={14} fill="currentColor" aria-hidden="true" />
                        <span>Jugar ahora</span>
                      </button>
                    </div>
                  </motion.article>
                ))}
              </motion.div>

              {totalPages > 1 && (
                <div className="host-pagination">
                  <button
                    className="host-pagination-btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Página anterior"
                  >
                    ‹
                  </button>
                  <span className="host-pagination-info">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    className="host-pagination-btn"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Página siguiente"
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* PDF / AI Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              className="host-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              aria-hidden="true"
            />
            <motion.div
              className="host-modal-container"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-ai-title"
            >
              <div className="host-modal">
                <button className="host-modal-close" onClick={closeModal} aria-label="Cerrar modal">
                  <X size={20} aria-hidden="true" />
                </button>

                {!successData ? (
                  <>
                    <div className="host-modal-header">
                      <h2 className="host-modal-title" id="modal-ai-title">Crear con IA</h2>
                      <p className="host-modal-subtitle">
                        Genera preguntas desde un PDF, tema, texto o URL
                      </p>
                    </div>

                    {/* Mode tabs */}
                    <div className="host-ai-tabs" role="tablist">
                      {[["pdf","PDF"],["topic","Tema"],["text","Texto"],["url","URL"]].map(([mode, label]) => (
                        <button
                          key={mode}
                          role="tab"
                          aria-selected={aiMode === mode}
                          className={`host-ai-tab${aiMode === mode ? " host-ai-tab--active" : ""}`}
                          onClick={() => { setAiMode(mode); setTextContent(""); setFile(null); }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {aiMode === "pdf" ? (
                      <>
                        <div
                          className={`host-upload-area${isDragging ? " host-upload-area--drag" : ""}`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <input
                            type="file"
                            id="pdf-upload"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="host-file-input"
                          />
                          {!file ? (
                            <label htmlFor="pdf-upload" className="host-upload-label">
                              <Upload size={28} aria-hidden="true" />
                              <span className="host-upload-text">
                                {isDragging ? "Suelta aquí el archivo" : "Haz clic o arrastra un PDF"}
                              </span>
                              <span className="host-upload-hint">Solo archivos .pdf</span>
                            </label>
                          ) : (
                            <div className="host-file-selected">
                              <FileText size={20} aria-hidden="true" />
                              <span className="host-file-name">{file.name}</span>
                              <button className="host-file-clear" onClick={() => setFile(null)} aria-label="Quitar archivo">
                                <X size={14} aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </div>
                        <label className="host-extract-toggle">
                          <input
                            type="checkbox"
                            checked={isExtractMode}
                            onChange={(e) => setIsExtractMode(e.target.checked)}
                            className="host-extract-checkbox"
                          />
                          <span className="host-extract-text">
                            El PDF ya contiene preguntas (extraer en lugar de generar)
                          </span>
                        </label>
                        <button
                          onClick={handleUpload}
                          disabled={!file || loading}
                          className="host-btn-generate"
                        >
                          {loading ? (
                            <><Spinner className="host-spinner" /><span>Generando preguntas...</span></>
                          ) : (
                            <><Sparkles size={17} aria-hidden="true" /><span>Generar preguntas</span></>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        {aiMode === "topic" && (
                          <div className="host-form-group">
                            <label className="host-form-label">Tema o materia</label>
                            <input
                              className="host-form-input"
                              placeholder="ej. La Revolución Francesa, Álgebra lineal…"
                              value={textContent}
                              onChange={(e) => setTextContent(e.target.value)}
                              maxLength={200}
                              autoFocus
                            />
                          </div>
                        )}
                        {aiMode === "text" && (
                          <div className="host-form-group">
                            <label className="host-form-label">Pega tu texto</label>
                            <textarea
                              className="host-form-textarea"
                              placeholder="Pega aquí el texto del que quieres generar preguntas..."
                              value={textContent}
                              onChange={(e) => setTextContent(e.target.value)}
                              rows={7}
                              autoFocus
                            />
                          </div>
                        )}
                        {aiMode === "url" && (
                          <div className="host-form-group">
                            <label className="host-form-label">URL de la página</label>
                            <div className="host-url-input-wrapper">
                              <Link2 size={16} className="host-url-icon" aria-hidden="true" />
                              <input
                                className="host-form-input host-form-input--url"
                                placeholder="https://..."
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                                type="url"
                                autoFocus
                              />
                            </div>
                          </div>
                        )}
                        <button
                          onClick={handleGenerateText}
                          disabled={!textContent.trim() || loading}
                          className="host-btn-generate"
                        >
                          {loading ? (
                            <><Spinner className="host-spinner" /><span>Generando preguntas...</span></>
                          ) : (
                            <><Sparkles size={17} aria-hidden="true" /><span>Generar preguntas</span></>
                          )}
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="host-success">
                    <div className="host-success-icon" aria-hidden="true">
                      <CheckCircle size={44} />
                    </div>
                    <h2 className="host-modal-title">¡Examen generado!</h2>
                    <p className="host-modal-subtitle">
                      Se crearon{" "}
                      <strong>{successData.totalQuestions} preguntas</strong>{" "}
                      sobre &ldquo;{successData.title}&rdquo;. Revísalas antes de guardar.
                    </p>
                    <div className="host-modal-actions">
                      <button className="host-btn-secondary" onClick={closeModal}>Cerrar</button>
                      <button
                        className="host-btn-primary"
                        onClick={() => navigate(`/edit/${successData.id}`, { state: { quizData: successData } })}
                      >
                        Editar y guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Assignment creation modal */}
      <AnimatePresence>
        {assignmentQuiz && (
          <>
            <motion.div
              className="host-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAssignmentModal}
              aria-hidden="true"
            />
            <motion.div
              className="host-modal-container"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-assignment-title"
            >
              <div className="host-modal">
                <button className="host-modal-close" onClick={closeAssignmentModal} aria-label="Cerrar">
                  <X size={20} aria-hidden="true" />
                </button>
                {!assignmentLink ? (
                  <>
                    <div className="host-modal-header">
                      <h2 className="host-modal-title" id="modal-assignment-title">Compartir como tarea</h2>
                      <p className="host-modal-subtitle">
                        Los estudiantes podrán completarla a su ritmo con el enlace.
                      </p>
                    </div>
                    <div className="host-form-group">
                      <label className="host-form-label" htmlFor="assignment-title-input">
                        Título de la tarea
                      </label>
                      <input
                        id="assignment-title-input"
                        className="host-form-input"
                        value={assignmentTitle}
                        onChange={(e) => setAssignmentTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateAssignment()}
                        maxLength={100}
                        placeholder="Título de la tarea..."
                        autoFocus
                      />
                    </div>
                    <div className="host-modal-actions">
                      <button className="host-btn-secondary" onClick={closeAssignmentModal}>
                        Cancelar
                      </button>
                      <button
                        className="host-btn-primary"
                        onClick={handleCreateAssignment}
                        disabled={!assignmentTitle.trim() || assignmentLoading}
                      >
                        {assignmentLoading ? "Creando..." : "Crear tarea"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="host-success">
                    <div className="host-success-icon" aria-hidden="true">
                      <CheckCircle size={44} />
                    </div>
                    <h2 className="host-modal-title">¡Tarea creada!</h2>
                    <p className="host-modal-subtitle">
                      Comparte este enlace con tus estudiantes.
                    </p>
                    <div className="host-link-box">
                      <span className="host-link-text">{assignmentLink}</span>
                      <button
                        className="host-link-copy"
                        onClick={() => {
                          navigator.clipboard.writeText(assignmentLink);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2500);
                        }}
                        aria-label="Copiar enlace"
                        title="Copiar enlace"
                      >
                        {linkCopied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} />}
                      </button>
                    </div>
                    <div className="host-modal-actions">
                      <button className="host-btn-secondary" onClick={closeAssignmentModal}>
                        Cerrar
                      </button>
                      <button
                        className="host-btn-primary"
                        onClick={() => { closeAssignmentModal(); navigate("/tareas"); }}
                      >
                        Ver tareas
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {quizToDelete && (
          <>
            <motion.div
              className="host-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuizToDelete(null)}
              aria-hidden="true"
            />
            <motion.div
              className="host-modal-container"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-delete-title"
            >
              <div className="host-modal host-modal-sm">
                <div className="host-delete-icon" aria-hidden="true">
                  <Trash2 size={26} />
                </div>
                <h2 className="host-modal-title" id="modal-delete-title">
                  ¿Eliminar examen?
                </h2>
                <p className="host-modal-subtitle">Esta acción no se puede deshacer.</p>
                <div className="host-modal-actions">
                  <button className="host-btn-secondary" onClick={() => setQuizToDelete(null)}>
                    Cancelar
                  </button>
                  <button className="host-btn-danger" onClick={executeDelete}>
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
