import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Mail, Heart, MessageCircle, Globe, Share2 } from "lucide-react";
import "./Footer.css";

export default function Footer() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    producto: [
      { label: "Características", href: "#features" },
      { label: "Cómo Funciona", href: "#how-it-works" },
      { label: "Precios", href: "#" },
      { label: "Casos de Uso", href: "#" },
    ],
    recursos: [
      { label: "Documentación", href: "#" },
      { label: "Tutoriales", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Centro de Ayuda", href: "#" },
    ],
    empresa: [
      { label: "Acerca de", href: "#" },
      { label: "Contacto", href: "#contact" },
      { label: "Carreras", href: "#" },
      { label: "Privacidad", href: "#" },
    ],
  };

  const socialLinks = [
    { icon: <MessageCircle size={20} />, href: "#", label: "Twitter" },
    { icon: <Globe size={20} />, href: "#", label: "GitHub" },
    { icon: <Share2 size={20} />, href: "#", label: "LinkedIn" },
    { icon: <Mail size={20} />, href: "mailto:contacto@cyraquiz.com", label: "Email" },
  ];

  const scrollToSection = (href) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Main footer content */}
        <div className="footer-content">
          {/* Brand section */}
          <div className="footer-brand">
            <motion.div
              className="footer-logo"
              onClick={() => navigate("/")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img src="/logo.svg" alt="CYRAQuiz" className="footer-logo-image" />
            </motion.div>
            <p className="footer-description">
              Transforma tus evaluaciones en experiencias interactivas que tus estudiantes
              amarán. Educación gamificada con inteligencia artificial.
            </p>
            {/* Social links */}
            <div className="footer-social">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  className="social-link"
                  aria-label={social.label}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links sections */}
          <div className="footer-links-wrapper">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category} className="footer-links-section">
                <h3 className="footer-section-title">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </h3>
                <ul className="footer-links-list">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="footer-link"
                        onClick={(e) => {
                          if (link.href.startsWith("#")) {
                            e.preventDefault();
                            scrollToSection(link.href);
                          }
                        }}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p className="footer-copyright">
              © {currentYear} CYRAQuiz. Todos los derechos reservados.
            </p>
            <p className="footer-credits">
              Hecho con <Heart size={14} className="heart-icon" /> para educadores
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
