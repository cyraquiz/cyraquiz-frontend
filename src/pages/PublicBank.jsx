import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Globe, BookOpen,
  Download, Loader2, X, RefreshCw,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { Toast } from "../components/common/Toast";
import "../styles/PublicBank.css";

const TYPE_LABELS = {
  single: "Simple",
  multi:  "Múltiple",
  tf:     "V/F",
  poll:   "Encuesta",
  text:   "Texto",
  slider: "Deslizador",
  scale:  "Escala",
};

function authorHandle(email) {
  if (!email) return "anónimo";
  return email.split("@")[0];
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  if (days < 365) return `hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) !== 1 ? "es" : ""}`;
  return `hace ${Math.floor(days / 365)} año${Math.floor(days / 365) !== 1 ? "s" : ""}`;
}

export default function PublicBank() {
  const navigate  = useNavigate();
  const { getUser } = useAuth();
  const searchRef = useRef(null);

  const [quizzes,    setQuizzes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cloning,    setCloning]    = useState(null);
  const [toast,      setToast]      = useState(null);

  const showToast = (message, type = "success") =>
    setToast({ message, type, id: Date.now() });

  const fetchBank = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/quizzes/public");
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setQuizzes(data.map(q => ({
          id:          q.id,
          title:       q.title,
          description: q.description || "",
          questions:   typeof q.questions === "string"
                         ? JSON.parse(q.questions)
                         : (q.questions || []),
          authorEmail: q.author_email || "",
          publishedAt: q.published_at,
        })));
      } else if (!res.ok) {
        showToast("Error al cargar el banco", "error");
      }
    } catch (err) {
      console.error("[PublicBank] fetchBank:", err);
      showToast("Error al cargar el banco", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBank(); }, []);

  const handleClone = async (quiz) => {
    if (!getUser().token) { navigate("/"); return; }
    setCloning(quiz.id);
    try {
      const res = await apiFetch(`/quizzes/${quiz.id}/clone`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast(`"${quiz.title}" importado a tus exámenes ✓`);
      } else {
        showToast(data.error || "Error al importar", "error");
      }
    } catch (err) {
      console.error("[PublicBank] handleClone:", err);
      showToast("Error de conexión", "error");
    } finally {
      setCloning(null);
    }
  };

  const filtered = quizzes.filter(q =>
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    authorHandle(q.authorEmail).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pb-page">

      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
            classPrefix="pb-toast"
          />
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="pb-nav" aria-label="Navegación del banco público">
        <button className="pb-back" onClick={() => navigate("/host")} aria-label="Volver al dashboard">
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Dashboard</span>
        </button>

        <div className="pb-nav-center" aria-hidden="true">
          <Globe size={19} className="pb-nav-icon" />
          <h1 className="pb-nav-title">Banco de Quizzes</h1>
        </div>

        <button
          className="pb-refresh"
          onClick={fetchBank}
          disabled={loading}
          aria-label="Recargar banco"
          title="Actualizar"
        >
          <RefreshCw size={15} className={loading ? "pb-spin" : ""} aria-hidden="true" />
        </button>
      </nav>

      {/* Search */}
      <div className="pb-search-bar" role="search">
        <Search size={15} className="pb-search-icon" aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          className="pb-search-input"
          placeholder="Buscar por título o autor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar quizzes"
        />
        <AnimatePresence>
          {searchTerm && (
            <motion.button
              className="pb-search-clear"
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
        {!loading && (
          <span className="pb-search-count" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "quiz" : "quizzes"}
          </span>
        )}
      </div>

      {/* Content */}
      <main className="pb-main" id="main-content">
        {loading ? (
          <div className="pb-loading" role="status" aria-live="polite">
            <Loader2 size={32} className="pb-spinner" aria-hidden="true" />
            <p>Cargando banco público...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="pb-empty">
            <div className="pb-empty-icon" aria-hidden="true">
              <Globe size={44} />
            </div>
            <p className="pb-empty-title">
              {searchTerm ? "Sin resultados" : "El banco está vacío"}
            </p>
            <p className="pb-empty-sub">
              {searchTerm
                ? `No hay quizzes con "${searchTerm}"`
                : "Sé el primero en publicar un quiz desde tu dashboard usando el ícono 🌐 en cada examen"}
            </p>
          </div>
        ) : (
          <div className="pb-grid" aria-label={`${filtered.length} quizzes públicos`}>
            {filtered.map((quiz, i) => {
              const types = [...new Set(quiz.questions.map(q => q.type || "single"))];
              return (
                <motion.article
                  key={quiz.id}
                  className="pb-card"
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0  }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  aria-label={`Quiz: ${quiz.title}, por @${authorHandle(quiz.authorEmail)}`}
                >
                  <div className="pb-card-header">
                    <div className="pb-card-icon" aria-hidden="true">
                      <BookOpen size={16} />
                    </div>
                    <span className="pb-card-author">
                      @{authorHandle(quiz.authorEmail)}
                    </span>
                    <span className="pb-card-time">{timeAgo(quiz.publishedAt)}</span>
                  </div>

                  <div className="pb-card-body">
                    <h3 className="pb-card-title">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="pb-card-desc">{quiz.description}</p>
                    )}
                    <div className="pb-card-meta">
                      <span className="pb-card-count">
                        {quiz.questions.length}
                        {quiz.questions.length === 1 ? " pregunta" : " preguntas"}
                      </span>
                      <div className="pb-type-pills" aria-label="Tipos de preguntas">
                        {types.slice(0, 3).map(type => (
                          <span key={type} className={`pb-type-pill pb-type-pill--${type}`}>
                            {TYPE_LABELS[type] || type}
                          </span>
                        ))}
                        {types.length > 3 && (
                          <span className="pb-type-pill pb-type-pill--more">
                            +{types.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pb-card-footer">
                    <button
                      className="pb-btn-import"
                      onClick={() => handleClone(quiz)}
                      disabled={cloning === quiz.id}
                      aria-label={`Importar quiz: ${quiz.title}`}
                    >
                      {cloning === quiz.id
                        ? <Loader2 size={14} className="pb-spin" aria-hidden="true" />
                        : <Download size={14} aria-hidden="true" />
                      }
                      <span>{cloning === quiz.id ? "Importando..." : "Importar a mis exámenes"}</span>
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
