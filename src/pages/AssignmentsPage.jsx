import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ClipboardList, Users, ChevronDown, ChevronUp,
  X, Copy, Check, Trash2, AlertCircle,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import { Toast } from "../components/common/Toast";
import "../styles/AssignmentsPage.css";

function Spinner() {
  return <div className="ap-spinner" aria-hidden="true" />;
}

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [loadingSubs, setLoadingSubs] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    apiFetch("/assignments")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAssignments(data);
      })
      .catch(() => showToast("Error al cargar tareas", "error"))
      .finally(() => setLoading(false));
  }, []);

  const toggleOpen = async (id) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    if (submissions[id]) return;
    setLoadingSubs(id);
    try {
      const res = await apiFetch(`/assignments/${id}/submissions`);
      const data = await res.json();
      setSubmissions((prev) => ({ ...prev, [id]: data.submissions || [] }));
    } catch {
      showToast("Error al cargar respuestas", "error");
    } finally {
      setLoadingSubs(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await apiFetch(`/assignments/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setAssignments((prev) => prev.filter((a) => a.id !== deleteId));
        showToast("Tarea eliminada");
      }
    } catch {
      showToast("Error al eliminar", "error");
    } finally {
      setDeleteId(null);
    }
  };

  const copyLink = (token, id) => {
    navigator.clipboard.writeText(`${window.location.origin}/asignacion/${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="ap-page">
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

      <nav className="ap-nav">
        <div className="ap-nav-inner">
          <button className="ap-back" onClick={() => navigate("/host")} aria-label="Volver a mis exámenes">
            <ArrowLeft size={18} />
            <span>Mis exámenes</span>
          </button>
          <img src="/logo.svg" alt="CYRAQuiz" className="ap-nav-logo" />
        </div>
      </nav>

      <main className="ap-main">
        <div className="ap-header">
          <div className="ap-header-icon">
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 className="ap-title">Mis Tareas</h1>
            <p className="ap-subtitle">
              {loading ? "Cargando..." : `${assignments.length} ${assignments.length === 1 ? "tarea activa" : "tareas activas"}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="ap-loading">
            <Spinner />
          </div>
        ) : assignments.length === 0 ? (
          <div className="ap-empty">
            <ClipboardList size={40} className="ap-empty-icon" />
            <p className="ap-empty-title">Sin tareas aún</p>
            <p className="ap-empty-text">
              Crea una tarea desde cualquier examen usando el botón de compartir.
            </p>
            <button className="ap-btn-back" onClick={() => navigate("/host")}>
              Ir a mis exámenes
            </button>
          </div>
        ) : (
          <div className="ap-list">
            {assignments.map((a) => {
              const isOpen = openId === a.id;
              const subs = submissions[a.id] || [];
              const link = `${window.location.origin}/asignacion/${a.token}`;

              return (
                <motion.div
                  key={a.id}
                  className={`ap-card${isOpen ? " ap-card--open" : ""}`}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Card header */}
                  <div className="ap-card-header">
                    <div className="ap-card-info">
                      <h3 className="ap-card-title">{a.title}</h3>
                      <div className="ap-card-meta">
                        <span className="ap-card-date">
                          {new Date(a.created_at).toLocaleDateString("es-MX", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                        <span className="ap-card-count">
                          <Users size={13} />
                          {a.submission_count} {a.submission_count === 1 ? "entrega" : "entregas"}
                        </span>
                      </div>
                    </div>

                    <div className="ap-card-actions">
                      <button
                        className="ap-btn-copy"
                        onClick={() => copyLink(a.token, a.id)}
                        title="Copiar enlace"
                        aria-label="Copiar enlace de tarea"
                      >
                        {copiedId === a.id ? <Check size={15} strokeWidth={2.5} /> : <Copy size={15} />}
                      </button>
                      <button
                        className="ap-btn-delete"
                        onClick={() => setDeleteId(a.id)}
                        title="Eliminar tarea"
                        aria-label="Eliminar tarea"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        className="ap-btn-toggle"
                        onClick={() => toggleOpen(a.id)}
                        aria-expanded={isOpen}
                        aria-label="Ver respuestas"
                      >
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        <span>{isOpen ? "Ocultar" : "Ver respuestas"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Link row */}
                  <div className="ap-link-row">
                    <span className="ap-link-url">{link}</span>
                  </div>

                  {/* Submissions panel */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        className="ap-submissions"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        {loadingSubs === a.id ? (
                          <div className="ap-subs-loading"><Spinner /></div>
                        ) : subs.length === 0 ? (
                          <p className="ap-subs-empty">Nadie ha entregado esta tarea todavía.</p>
                        ) : (
                          <table className="ap-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Estudiante</th>
                                <th>Puntaje</th>
                                <th>Fecha</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subs.map((s, i) => {
                                const pct = s.total_possible > 0
                                  ? Math.round((s.score / s.total_possible) * 100)
                                  : null;
                                return (
                                  <tr key={s.id}>
                                    <td className="ap-td-num">{i + 1}</td>
                                    <td className="ap-td-name">{s.student_name}</td>
                                    <td className="ap-td-score">
                                      {s.total_possible > 0
                                        ? `${s.score}/${s.total_possible} (${pct}%)`
                                        : "Sin puntaje"}
                                    </td>
                                    <td className="ap-td-date">
                                      {new Date(s.submitted_at).toLocaleDateString("es-MX", {
                                        day: "numeric", month: "short",
                                      })}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div
              className="ap-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)}
              aria-hidden="true"
            />
            <motion.div
              className="ap-dialog-container"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
            >
              <div className="ap-dialog">
                <button className="ap-dialog-close" onClick={() => setDeleteId(null)} aria-label="Cancelar">
                  <X size={20} />
                </button>
                <div className="ap-dialog-icon">
                  <AlertCircle size={28} />
                </div>
                <h3 className="ap-dialog-title">¿Eliminar tarea?</h3>
                <p className="ap-dialog-text">
                  Se eliminarán también todas las entregas de los estudiantes. Esta acción no se puede deshacer.
                </p>
                <div className="ap-dialog-actions">
                  <button className="ap-btn-cancel" onClick={() => setDeleteId(null)}>Cancelar</button>
                  <button className="ap-btn-confirm-delete" onClick={handleDelete}>Eliminar</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
