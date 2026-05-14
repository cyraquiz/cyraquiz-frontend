# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CYRAQuiz es un sistema de quiz interactivo en tiempo real (similar a Kahoot) con dos roles principales: **Profesores** (hosts) y **Estudiantes**.

**Stack:**
- React 19 + Vite
- Socket.IO Client para comunicación en tiempo real
- Supabase para autenticación y almacenamiento
- Backend API: `https://cyraquiz.onrender.com`

## Development Commands

```bash
# Iniciar servidor de desarrollo (expuesto en red local)
npm run dev

# Build para producción
npm run build

# Lint del código
npm run lint

# Preview del build
npm run preview
```

## Architecture

### User Flows

**Profesor (Host):**
1. `Login.jsx` → Autenticación con email/password
2. `Host.jsx` → Dashboard con lista de quizzes, búsqueda, y opción de crear
3. `EditQuiz.jsx` → Editor de preguntas (crear/editar/guardar)
4. `GameRoom.jsx` → Lobby pre-juego donde se espera a los estudiantes
5. `HostGame.jsx` → Pantalla de juego activo (muestra pregunta, estadísticas en tiempo real, gráficas)
6. `Podium.jsx` → Resultados finales con animación de podio

**Estudiante:**
1. `Join.jsx` → Ingresa PIN de juego, nombre y selecciona avatar
2. `StudentLobby.jsx` → Sala de espera mostrando jugadores conectados
3. `GameController.jsx` → Pantalla de juego (responde preguntas)
4. Resultados finales mostrados en `GameController.jsx` (estado `game_over`)

### Socket.IO Events

**Cliente emite:**
- `join_room` - Estudiante se une con roomCode, playerName, avatar
- `submit_answer` - Envía respuesta del estudiante
- `send_question` - Host envía pregunta a todos los jugadores
- `show_results` - Host revela respuestas correctas
- `cancel_game` - Host termina el juego

**Cliente escucha:**
- `player_joined` - Nuevo jugador se unió
- `new_question` - Nueva pregunta recibida
- `answer_result` - Resultado de la respuesta (puntos ganados, correcto/incorrecto)
- `reveal_results` - Momento de mostrar resultados
- `player_answered` - Alguien respondió (incrementa contador)
- `update_stats` - Actualiza gráfica de respuestas en tiempo real
- `final_results` - Ranking final del juego
- `game_cancelled` - Juego cancelado por el host
- `error` - Mensajes de error del servidor

### Question Types

```javascript
{
  type: "single",      // Selección simple (1 respuesta correcta)
  type: "multi",       // Selección múltiple (2 respuestas correctas)
  type: "tf",          // Verdadero/Falso
  question: string,
  options: string[],   // 4 opciones (o 2 para tf)
  answer: string | string[], // string para single/tf, array para multi
  time: number,        // segundos (10-300)
  points: number       // 50-500
}
```

### Backend API Endpoints

**Autenticación:**
- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Login (retorna JWT token)

**Quizzes:**
- `GET /quizzes` - Lista de quizzes del usuario (requiere header `token`)
- `POST /quizzes` - Crear nuevo quiz
- `PUT /quizzes/:id` - Actualizar quiz existente
- `DELETE /quizzes/:id` - Eliminar quiz

**Generación de Preguntas con IA:**
- `POST /upload` - Sube PDF, retorna preguntas generadas
  - FormData: `pdfFile`, `casillaMarcada` (boolean: true = extraer preguntas existentes, false = generar con IA)

### Important Files

- `src/socket.js` - Configuración global de Socket.IO (autoConnect: false)
- `src/main.jsx` - Definición de todas las rutas
- `src/styles/variables.css` - Variables CSS globales
- `public/avatars/` - 48 avatares de personajes Disney/Marvel/Harry Potter
- `public/*.mp3` - Sonidos del juego (countdown, lobby, question, result, etc.)

### State Management Patterns

No usa Redux/Context API. El estado se maneja localmente en componentes y se sincroniza vía Socket.IO y localStorage:

- `localStorage.getItem("token")` - JWT para autenticación
- `localStorage.getItem("userEmail")` - Email del usuario logueado
- `localStorage.getItem("join_roomCode")` - Último PIN usado por estudiante
- `localStorage.getItem("join_name")` - Último nombre usado
- `localStorage.getItem("join_avatar")` - Avatar seleccionado

### Key Implementation Details

**Scoring System (en backend):**
- Puntos base dependen de la pregunta (50-500)
- Bonus por velocidad: respuestas más rápidas ganan más puntos
- Solo se otorgan puntos por respuestas correctas

**Game Lifecycle:**
1. Host crea sala → genera `roomCode` único
2. Estudiantes se unen vía Socket.IO
3. Host inicia juego → envía preguntas secuencialmente
4. Cada pregunta tiene temporizador
5. Al terminar todas las preguntas → navegación a `/podium/:roomCode`
6. Socket.IO emite `final_results` con ranking ordenado por score y tiempo

**Real-time Sync:**
- `HostGame.jsx` muestra barra de progreso de tiempo y contador de respuestas
- Cuando `answersCount >= players.length`, se fuerza `reveal_results` automáticamente
- `GameController.jsx` cambia entre estados: waiting → answering → submitted → result → game_over

**Sound Management:**
- `use-sound` hook para reproducir efectos
- Música de pregunta se reproduce en loop durante `timeLeft > 0`
- Se detiene automáticamente al cambiar a `isShowingResult`
