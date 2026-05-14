import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, X } from "lucide-react";

export function Toast({ message, type = "success", onDismiss, classPrefix = "toast" }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      className={`${classPrefix} ${classPrefix}--${type}`}
      initial={{ opacity: 0, y: -16, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: -16, x: "-50%" }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      role="alert"
      aria-live="polite"
    >
      {type === "success"
        ? <CheckCircle size={16} aria-hidden="true" />
        : <AlertCircle size={16} aria-hidden="true" />}
      <span>{message}</span>
      <button
        className={`${classPrefix}-close`}
        onClick={onDismiss}
        aria-label="Cerrar notificación"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </motion.div>
  );
}
