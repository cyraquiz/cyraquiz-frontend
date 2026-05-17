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

### 2. Reportes descargables por partida (CSV)
**Fecha:** 2026-05-17

Se añadió la capacidad de exportar los resultados finales de cada partida como archivo `.csv`, compatible con Excel (BOM UTF-8 para tildes y ñ).

- `src/utils/exportCsv.js` — utilidad reutilizable de generación y descarga de CSV
- `src/pages/Podium.jsx` — botón "Descargar resultados" visible al finalizar la partida
- Columnas exportadas: Posición, Jugador, Puntaje, Tiempo promedio (s)
- Nombres sanitizados contra inyección CSV y caracteres inválidos en nombres de archivo

### 3. Duplicar pregunta + Drag & drop en editor
**Fecha:** 2026-05-17

- Botón Copy en cada tarjeta del editor para duplicar una pregunta al instante
- Reordenamiento por arrastre con @dnd-kit (touch + mouse), sin conflicto con Framer Motion

### 4. Ghost Mode — Práctica sin conexión
**Fecha:** 2026-05-17

- Las preguntas de cada partida se guardan automáticamente en localStorage al terminar
- `/ghost`: lista de quizzes guardados, reproductor solo con timer, comparación contra récord anterior
- Botón de acceso directo desde la página de Join

### 5. Generación con IA desde tema, texto y URL
**Fecha:** 2026-05-17

El modal "Crear con IA" ahora incluye 4 pestañas:

| Modo | Descripción |
|------|-------------|
| PDF | Sube un archivo .pdf (comportamiento original) |
| Tema | Escribe el nombre de una materia o tema |
| Texto | Pega texto libre del que se extraen preguntas |
| URL | Ingresa una URL; el backend la descarga y extrae el contenido |

Backend: endpoint `POST /generate-text` con campo `mode` (`topic`\|`text`\|`url`) y `content`.

### 6. Modo Asignación — Tarea asíncrona
**Fecha:** 2026-05-17

Permite que los estudiantes completen un examen sin necesidad de una sesión en vivo:

- **Botón "Compartir"** en cada quiz card del dashboard del profesor
- Crea un registro en la tabla `assignments` con token UUID único
- Enlace público `/asignacion/:token` — estudiante ingresa su nombre y responde a su ritmo
- Compatible con todos los 7 tipos de pregunta
- Calcula el puntaje localmente y lo envía al backend (`POST /assignments/student/:token/submit`)
- Previene doble entrega por nombre (case-insensitive)
- **Página "Mis Tareas"** (`/tareas`) — lista todas las tareas del profesor con conteo de entregas, copia del enlace y tabla de respuestas expandible

---

## Descartado

- Racha/badges (Streaks system)
- Confidence Mode
- Branding personalizado
- Modo por equipos (Team Mode)
