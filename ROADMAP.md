# CYRAQuiz — Roadmap de Implementaciones

Registro incremental de funcionalidades añadidas al sistema, inspiradas en el análisis competitivo de plataformas premium como Kahoot.

---

## Implementaciones completadas

### 1. Nuevos tipos de pregunta
**Fecha:** 2026-05-16

Se expandió el sistema de preguntas de 3 tipos a 7, cubriendo casos de uso educativos y de opinión:

| Tipo | Descripción | Puntos |
|------|-------------|--------|
| `single` | Selección simple (existente) | Sí |
| `multi` | Selección múltiple (existente) | Sí |
| `tf` | Verdadero / Falso (existente) | Sí |
| `poll` | Encuesta — opciones sin respuesta correcta | No |
| `scale` | Escala de valoración 1–5 | No |
| `text` | Respuesta escrita libre (match exacto) | Sí |
| `slider` | Deslizador numérico en rango configurable | Sí |

Cambios realizados: editor (`EditQuiz.jsx`), controlador del estudiante (`GameController.jsx`), vista del host (`HostGame.jsx`) y estilos CSS correspondientes.

---

## En progreso / Pendiente

- [ ] Modo Asignación / Tarea asíncrona
- [ ] Reportes descargables por partida (CSV)
- [ ] Generación con IA desde URL / tema de texto
- [ ] Sistema de rachas e insignias
- [ ] Confidence Mode
- [ ] Ghost Mode
- [ ] Branding personalizado por profesor
- [ ] Team Mode expandido
