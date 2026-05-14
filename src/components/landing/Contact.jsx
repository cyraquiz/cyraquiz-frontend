import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Send, CheckCircle, Sparkles } from "lucide-react";
import "./Contact.css";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simular envío (aquí conectarías con tu backend)
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });

      // Reset success message after 5 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 5000);
    }, 1500);
  };

  const contactInfo = [
    {
      icon: <Mail size={24} />,
      title: "Email",
      value: "contacto@cyraquiz.com",
      href: "mailto:contacto@cyraquiz.com",
    },
    {
      icon: <MessageSquare size={24} />,
      title: "Soporte",
      value: "Respuesta en menos de 24h",
      href: "#",
    },
  ];

  return (
    <section className="contact" id="contact">
      <div className="contact-container">
        {/* Header */}
        <motion.div
          className="contact-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="contact-eyebrow">Contacto</p>
          <h2 className="contact-title">
            ¿Tienes preguntas?<br />
            <span className="contact-title-accent">Estamos aquí para ayudarte</span>
          </h2>
          <p className="contact-subtitle">
            Escríbenos y te respondemos en menos de 24 horas.
          </p>
        </motion.div>

        {/* Content Grid */}
        <div className="contact-content">
          {/* Contact Info */}
          <motion.div
            className="contact-info-section"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h3 className="contact-info-title">Información de contacto</h3>
            <p className="contact-info-description">
              Nos encantaría saber de ti. Elige la forma que prefieras para comunicarte con
              nosotros.
            </p>

            <div className="contact-info-cards">
              {contactInfo.map((info, index) => (
                <motion.a
                  key={info.title}
                  href={info.href}
                  className="contact-info-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="contact-info-icon">{info.icon}</div>
                  <div className="contact-info-content">
                    <h4 className="contact-info-card-title">{info.title}</h4>
                    <p className="contact-info-value">{info.value}</p>
                  </div>
                </motion.a>
              ))}
            </div>

            {/* Additional info */}
            <div className="contact-additional-info">
              <h4 className="additional-info-title">Horario de atención</h4>
              <p className="additional-info-text">
                Lunes a Viernes: 9:00 AM - 6:00 PM (GMT-6)
              </p>
              <p className="additional-info-text">
                Sábados: 10:00 AM - 2:00 PM (GMT-6)
              </p>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            className="contact-form-section"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {isSubmitted ? (
              <motion.div
                className="success-message"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <CheckCircle size={48} />
                <h3>¡Mensaje enviado con éxito!</h3>
                <p>Te responderemos a la brevedad posible.</p>
              </motion.div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Tu nombre"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-input"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="tu@email.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject" className="form-label">
                    Asunto
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    className="form-input"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="¿En qué podemos ayudarte?"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message" className="form-label">
                    Mensaje
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    className="form-textarea"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Cuéntanos más sobre tu consulta..."
                    rows="6"
                    required
                  />
                </div>

                <motion.button
                  type="submit"
                  className="form-submit-button"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSubmitting ? (
                    <span>Enviando...</span>
                  ) : (
                    <>
                      <span>Enviar mensaje</span>
                      <Send size={18} />
                    </>
                  )}
                </motion.button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
