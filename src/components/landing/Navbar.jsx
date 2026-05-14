import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, HelpCircle, Mail, LogIn, Play, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const { openLogin, openRegister } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Características", href: "#features" },
    { label: "Cómo Funciona", href: "#how-it-works" },
    { label: "Contacto", href: "#contact" },
  ];

  const scrollToSection = (href) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const mobileMenuItems = [
    {
      label: "Inicio",
      icon: <Home size={20} />,
      action: () => window.scrollTo({ top: 0, behavior: "smooth" }),
    },
    {
      label: "Características",
      icon: <Sparkles size={20} />,
      action: () => scrollToSection("#features"),
    },
    {
      label: "Funciona",
      icon: <HelpCircle size={20} />,
      action: () => scrollToSection("#how-it-works"),
    },
    {
      label: "Contacto",
      icon: <Mail size={20} />,
      action: () => scrollToSection("#contact"),
    },
    {
      label: "Login",
      icon: <LogIn size={20} />,
      action: openLogin,
    },
  ];

  return (
    <>
      <motion.nav
        className={`navbar ${isScrolled ? "navbar-scrolled" : ""}`}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="navbar-container">
          {/* Logo */}
          <motion.div
            className="navbar-logo"
            onClick={() => navigate("/")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img src="/logo.svg" alt="CYRAQuiz" className="logo-image" />
          </motion.div>

          {/* Desktop Links */}
          <div className="navbar-links">
            {navItems.map((item, index) => (
              <motion.a
                key={item.label}
                href={item.href}
                className="navbar-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(item.href);
                }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
              >
                {item.label}
              </motion.a>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="navbar-actions">
            <motion.button
              className="navbar-btn-login"
              onClick={openLogin}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Login
            </motion.button>

            <motion.button
              className="navbar-btn-cta"
              onClick={openRegister}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Comenzar
              <ArrowRight size={18} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Bottom Navigation */}
      <motion.nav
        className="mobile-bottom-nav"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mobile-bottom-nav-container">
          {mobileMenuItems.map((item, index) => (
            <motion.button
              key={item.label}
              className="mobile-nav-item"
              onClick={item.action}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.05, duration: 0.3 }}
            >
              <div className="mobile-nav-icon">{item.icon}</div>
              <span className="mobile-nav-label">{item.label}</span>
            </motion.button>
          ))}

          {/* CTA Button destacado */}
          <motion.button
            className="mobile-nav-cta"
            onClick={openRegister}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.4, type: "spring", stiffness: 200 }}
          >
            <div className="mobile-nav-cta-icon">
              <Play size={24} fill="currentColor" />
            </div>
          </motion.button>
        </div>
      </motion.nav>
    </>
  );
}
