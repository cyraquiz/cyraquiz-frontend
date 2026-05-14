import { motion } from "framer-motion";
import { Sparkles, Edit3, Users, BarChart3, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./HowItWorks.css";

export default function HowItWorks() {
  const { openRegister } = useAuth();

  const steps = [
    {
      number: "01",
      icon: <Edit3 size={32} />,
      title: "Crea tu evaluación",
      description:
        "Genera preguntas automáticamente con IA ingresando el tema, o crea tu quiz manualmente. Personaliza tiempos, puntos y dificultad.",
      details: ["Generación con IA en segundos", "Banco de preguntas reutilizable", "Múltiples formatos de pregunta"],
    },
    {
      number: "02",
      icon: <Users size={32} />,
      title: "Los estudiantes se unen",
      description:
        "Comparte un código simple de 6 dígitos. Tus estudiantes ingresan desde cualquier dispositivo sin necesidad de crear cuenta.",
      details: ["Sin instalación de apps", "Acceso instantáneo", "Soporte multiplataforma"],
    },
    {
      number: "03",
      icon: <BarChart3 size={32} />,
      title: "Visualiza resultados",
      description:
        "Sigue el desempeño en tiempo real. Al finalizar, obtén estadísticas detalladas por estudiante, pregunta y tema.",
      details: ["Resultados instantáneos", "Gráficos interactivos", "Exportación de datos"],
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const stepVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <section className="how-it-works" id="how-it-works">
      {/* Background decoration */}
      <div className="how-it-works-background">
        <motion.div
          className="background-blob blob-left"
          animate={{
            x: [0, 20, 0],
            y: [0, -20, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="background-blob blob-right"
          animate={{
            x: [0, -20, 0],
            y: [0, 20, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="how-it-works-container">
        {/* Header */}
        <motion.div
          className="how-it-works-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="how-it-works-eyebrow">Cómo funciona</p>
          <h2 className="how-it-works-title">
            De la idea a resultados<br />
            en <span className="how-it-works-title-accent">3 pasos</span>
          </h2>
          <p className="how-it-works-subtitle">
            Intuitivo desde el primer momento. Sin capacitación, sin manuales.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          className="steps-container"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {steps.map((step, index) => (
            <motion.div key={step.number} className="step-wrapper" variants={stepVariants}>
              <div className="step-card">
                {/* Step number */}
                <div className="step-number-badge">{step.number}</div>

                {/* Icon */}
                <div className="step-icon-wrapper">
                  <div className="step-icon">{step.icon}</div>
                </div>

                {/* Content */}
                <div className="step-content">
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-description">{step.description}</p>

                  {/* Details list */}
                  <ul className="step-details">
                    {step.details.map((detail, i) => (
                      <li key={i} className="step-detail-item">
                        <div className="detail-bullet" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Connector arrow (not on last step) */}
                {index < steps.length - 1 && (
                  <div className="step-connector">
                    <ArrowRight size={24} />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          className="how-it-works-cta"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <motion.button
            className="cta-button"
            onClick={openRegister}
            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(90, 14, 36, 0.25)" }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Comienza gratis ahora</span>
            <ArrowRight size={20} strokeWidth={2.5} />
          </motion.button>
          <p className="cta-note">No requiere tarjeta de crédito</p>
        </motion.div>
      </div>
    </section>
  );
}
