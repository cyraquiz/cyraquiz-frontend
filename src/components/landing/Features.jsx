import { motion } from "framer-motion";
import {
  Brain,
  Zap,
  Trophy,
  Palette,
  BarChart3,
  Target,
  Users,
  Clock,
  Sparkles,
} from "lucide-react";
import "./Features.css";

const featuredFeatures = [
  {
    icon: <Brain size={36} />,
    title: "IA que trabaja por ti",
    description:
      "Sube un PDF con tus apuntes o escribe el tema. La IA genera un quiz completo en segundos, listo para lanzar.",
    accent: "dark",
  },
  {
    icon: <Zap size={36} />,
    title: "Todo en tiempo real",
    description:
      "Tus estudiantes responden al instante desde cualquier dispositivo. Sin apps que instalar, sin cuentas que crear.",
    accent: "warm",
  },
  {
    icon: <Trophy size={36} />,
    title: "Gamificación total",
    description:
      "Puntos por velocidad, ranking en vivo y podio al final. Competencia sana que engancha hasta al más distraído.",
    accent: "mid",
  },
];

const secondaryFeatures = [
  {
    icon: <Palette size={20} />,
    title: "+50 Avatares",
    description: "Identidad visual única para cada estudiante.",
  },
  {
    icon: <BarChart3 size={20} />,
    title: "Resultados al instante",
    description: "Estadísticas por pregunta y por estudiante.",
  },
  {
    icon: <Target size={20} />,
    title: "Datos precisos",
    description: "Identifica áreas de oportunidad fácilmente.",
  },
  {
    icon: <Users size={20} />,
    title: "Sin límite de alumnos",
    description: "Desde 5 hasta cientos de participantes.",
  },
  {
    icon: <Clock size={20} />,
    title: "Lista en 2 minutos",
    description: "Crear y lanzar un quiz es cuestión de minutos.",
  },
  {
    icon: <Sparkles size={20} />,
    title: "Experiencia pulida",
    description: "Diseñada para sorprender en cada sesión.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Features() {
  return (
    <section className="features" id="features">
      <div className="features-container">
        <motion.div
          className="features-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="features-eyebrow">Características</p>
          <h2 className="features-title">
            Todo lo que necesitas<br />para evaluar mejor
          </h2>
          <p className="features-subtitle">
            Una plataforma completa que transforma cómo evalúas. Potente, intuitiva y divertida.
          </p>
        </motion.div>

        {/* Featured: 3 tarjetas con distinto peso visual */}
        <motion.div
          className="features-grid-featured"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {featuredFeatures.map((feature) => (
            <motion.div
              key={feature.title}
              className={`feature-card-featured accent-${feature.accent}`}
              variants={itemVariants}
              whileHover={{ y: -6, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
            >
              <div className="featured-icon-wrap">{feature.icon}</div>
              <h3 className="featured-title">{feature.title}</h3>
              <p className="featured-description">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Secondary: grid de tabla sin tarjetas */}
        <motion.div
          className="features-grid-secondary"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {secondaryFeatures.map((feature) => (
            <motion.div
              key={feature.title}
              className="feature-item-secondary"
              variants={itemVariants}
            >
              <div className="secondary-icon">{feature.icon}</div>
              <div className="secondary-content">
                <h4 className="secondary-title">{feature.title}</h4>
                <p className="secondary-description">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
