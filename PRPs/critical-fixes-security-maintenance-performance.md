# PRP: Correcciones Críticas — Seguridad, Mantenimiento y Rendimiento

## Metadata
```yaml
name: critical-fixes-security-maintenance-performance
version: 1.0
confidence: 8/10
estimated_sessions: 1
priority: P0
```

---

## Goal

Resolver 3 categorías de problemas críticos en CYRAQuiz **sin romper ninguna funcionalidad existente ni modificar el diseño visual**:

1. **Seguridad**: Socket.IO sin autenticación, token JWT en localStorage, sin validación de inputs en eventos de socket.
2. **Mantenimiento**: Componentes duplicados (Toast, Spinner), constantes duplicadas, acceso a API sin centralizar, paquetes instalados pero no usados.
3. **Rendimiento**: 48 avatares sin lazy loading, lista de quizzes sin paginación, paquete `@supabase/supabase-js` (~300KB) incluido en el bundle del frontend sin utilizarse.

---

## Why

- **Seguridad**: Cualquier estudiante puede emitir `cancel_game`, `game_over` o `send_question` con cualquier roomCode vía DevTools → puede cancelar partidas ajenas, alterar puntajes, inyectar preguntas falsas.
- **Mantenimiento**: Toast idéntico en `Host.jsx:11-40` y `EditQuiz.jsx:12-37`. Constantes `OPTION_BG/SHADOW/LETTER` duplicadas en `HostGame.jsx:11-13` y `GameController.jsx:8-10`. 7 llamadas a la API esparcidas en 3 archivos sin wrapper centralizado. Esto hace que cada cambio requiera editar N archivos.
- **Rendimiento**: `@supabase/supabase-js` añade ~300KB al bundle final sin nunca importarse en el frontend. 48 imágenes PNG (9.1MB total) se intentan cargar simultáneamente al abrir el selector de avatar.

---

## What

### Cambios en Backend (`cyraquiz-backend/src/server.js`)
- **Host token**: Al crear una sala (`create_room`), el backend genera un `hostToken` UUID y lo devuelve al cliente vía socket. Los eventos privilegiados (`send_question`, `show_results`, `game_over`, `cancel_game`) requieren este token para ejecutarse.
- **Validación de inputs**: Validar longitud y formato de `playerName` (max 20, no vacío), `roomCode` (exactamente 6 dígitos numéricos), `answer` (string o array, max 200 chars).
- **Rate limiting básico**: Máximo 30 conexiones por IP para `join_room`, usando un `Map` en memoria simple.

### Cambios en Frontend (`cyraquiz-frontend-main/src/`)
- **`src/utils/api.js`** — wrapper centralizado para fetch con base URL + token automático.
- **`src/components/common/Toast.jsx`** — extrae componente compartido (actualmente duplicado en Host y EditQuiz).
- **`src/components/common/Spinner.jsx`** — extrae componente compartido.
- **`src/constants/game.js`** — extrae `OPTION_BG`, `OPTION_SHADOW`, `OPTION_LETTER` (actualmente duplicados en HostGame y GameController).
- **`src/context/AuthContext.jsx`** — mueve la gestión de token/email a este contexto con sessionStorage.
- **`Host.jsx`**, **`EditQuiz.jsx`**, **`AuthModal.jsx`** — usar los nuevos utilities.
- **`GameRoom.jsx`**, **`HostGame.jsx`** — usar `hostToken` generado por el socket.
- **`Join.jsx`** — añadir `loading="lazy"` a imágenes del selector de avatar.
- **`Host.jsx`** — paginación simple (12 quizzes por página).
- **`package.json`** — eliminar `@supabase/supabase-js`, `clsx`, `react-intersection-observer` (ninguno se usa en el frontend).

---

## Success Criteria

- [ ] Un estudiante NO puede emitir `cancel_game` o `send_question` sin el hostToken correcto
- [ ] Input inválido en socket events (nombre vacío, roomCode incorrecto) es rechazado en el servidor
- [ ] El componente `Toast` existe en un solo archivo y es importado por Host y EditQuiz
- [ ] `OPTION_BG/SHADOW/LETTER` existen en un solo archivo `constants/game.js`
- [ ] Las 7 llamadas HTTP a la API usan `api.js` en lugar de `fetch` directo
- [ ] El bundle NO incluye `@supabase/supabase-js` ni `clsx`
- [ ] Las imágenes del selector de avatares tienen `loading="lazy"`
- [ ] Con 20+ quizzes, Host solo renderiza 12 a la vez
- [ ] Todo el flujo de juego (crear sala → lobby → juego → podio) funciona sin errores
- [ ] El diseño visual es idéntico al actual

---

## All Needed Context

### Arquitectura actual del proyecto

```
cyraquiz-backend/src/
├── server.js          ← Socket.IO + Express server (ARCHIVO PRINCIPAL)
├── middleware/
│   └── authorization.js  ← Valida JWT de Supabase en rutas REST
├── routes/
│   ├── auth.js        ← POST /auth/login, POST /auth/register
│   └── quizzes.js     ← CRUD /quizzes (requiere authorization middleware)
└── db/                ← Conexión PostgreSQL

cyraquiz-frontend-main/src/
├── main.jsx           ← Rutas React Router, monta AuthProvider, llama socket.connect()
├── socket.js          ← io(VITE_API_URL, { autoConnect: false }) — instancia global
├── context/
│   └── AuthContext.jsx ← Solo maneja estado del modal (isOpen, mode) — NO maneja el token
├── pages/
│   ├── Host.jsx        ← 649 líneas. Tiene Toast y Spinner inline. Lee token de localStorage
│   ├── EditQuiz.jsx    ← 651 líneas. Tiene Toast y Spinner duplicados. Lee token de localStorage
│   ├── GameRoom.jsx    ← Crea sala con create_room. Navega a HostGame con players
│   ├── HostGame.jsx    ← Emite send_question, show_results, cancel_game (SIN validación)
│   ├── GameController.jsx ← Emite submit_answer (estudiante)
│   ├── Join.jsx        ← 48 avatares PNG sin lazy loading en el picker modal
│   └── StudentLobby.jsx
├── components/
│   └── auth/AuthModal.jsx ← Hace fetch a /auth/login y /auth/register
├── utils/
│   └── lazyLoad.js     ← Lazy imports de landing components (ya existe)
└── constants/          ← NO EXISTE AÚN — hay que crear

public/avatars/          ← 48 archivos PNG, 9.1MB total, 36KB-640KB cada uno
```

### Estado actual de seguridad Socket.IO

**Flujo actual (inseguro):**
```
Cliente → socket.emit("create_room", roomCode)   ← roomCode generado por el CLIENTE
Cliente → socket.emit("send_question", {...})     ← cualquiera puede hacerlo
Cliente → socket.emit("cancel_game", roomCode)   ← cualquiera puede cancelar cualquier sala
Cliente → socket.emit("game_over", roomCode)      ← cualquiera puede terminar cualquier sala
```

**Flujo seguro objetivo:**
```
GameRoom.jsx emite create_room(roomCode)
  → server responde con socket.emit("room_created", { hostToken })
  → GameRoom.jsx guarda hostToken y lo pasa por navigate state a HostGame.jsx

HostGame.jsx emite send_question({ roomCode, question, time, hostToken })
  → server verifica rooms.get(roomCode).hostToken === hostToken
  → si no coincide: socket.emit("error", "No autorizado")
  → si coincide: ejecuta la lógica normal
```

### Código actual a reusar/modificar (extractos clave)

**`server.js:55-65` — rooms Map y create_room actual:**
```javascript
const rooms = new Map();

io.on("connection", (socket) => {
  socket.on("create_room", (roomCode) => {
    rooms.set(roomCode, { players: [], currentQuestion: 0, scores: {}, answerCounts: [0, 0, 0, 0] });
    socket.join(roomCode);
    console.log(`Sala creada: ${roomCode}`);
  });
```

**`server.js:103-114` — start_game actual (no necesita cambios):**
```javascript
socket.on("start_game", (roomCode) => {
  const roomStr = roomCode.toString();
  if (rooms.has(roomStr)) {
    io.to(roomStr).emit("game_started");
  }
});
```

**`GameRoom.jsx:37-48` — crea sala actual:**
```javascript
useEffect(() => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  setRoomCode(code);
  const createRoom = () => socket.emit("create_room", code);
  if (socket.connected) { createRoom(); } 
  else { socket.once("connect", createRoom); socket.connect(); }
  ...
}, []);
```

**`HostGame.jsx:88-92` — send_question actual:**
```javascript
socket.emit("send_question", {
  roomCode,
  question: currentQ,
  time: currentQ.time || 20,
});
```

**`AuthModal.jsx:54-76` — login actual:**
```javascript
const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const data = await response.json();
if (response.ok) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("userEmail", data.user.email);
  handleClose();
  navigate("/host");
}
```

**`Host.jsx:80-116` — fetch quizzes actual:**
```javascript
const token = localStorage.getItem("token");
const res = await fetch(`${import.meta.env.VITE_API_URL}/quizzes`, {
  headers: { token },
});
```

**`Host.jsx:11-40` — Toast (duplicado en EditQuiz.jsx:12-37):**
```javascript
function Toast({ message, type = "success", onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <motion.div className={`host-toast host-toast--${type}`} ...>
      {type === "success" ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
      <span>{message}</span>
      <button className="host-toast-close" onClick={onDismiss}><X size={14}/></button>
    </motion.div>
  );
}
```

**Constantes duplicadas — `HostGame.jsx:11-13` y `GameController.jsx:8-10`:**
```javascript
const OPTION_BG     = ["#EDA35A", "#A50E24", "#9195F6", "#574964"];
const OPTION_SHADOW = ["#C68848", "#7D0A1B", "#7579CA", "#3E3447"];
const OPTION_LETTER = ["A", "B", "C", "D"];
```

**`Join.jsx:299-328` — grid de avatares sin lazy loading:**
```javascript
<div className="join-avatar-grid">
  {AVATARES.map((img) => (
    <motion.div key={img} ...>
      <img
        src={`/avatars/${img}`}
        alt="avatar"
        className="join-avatar-option-img"
        // ← FALTA loading="lazy"
      />
    </motion.div>
  ))}
</div>
```

### Paquetes instalados sin uso en frontend

```json
"@supabase/supabase-js": "^2.95.3",  // ← NUNCA importado en src/. Solo en backend.
"clsx": "^2.1.1",                     // ← NUNCA importado en src/
"react-intersection-observer": "^0.10.0.3" // ← NUNCA importado. whileInView es de Framer Motion.
```

Verificado con grep exhaustivo en todos los archivos .jsx y .js de src/.

### Documentación relevante

```yaml
- url: https://socket.io/docs/v4/server-api/#socketemiteventname-args
  why: Respuesta server→cliente tras create_room para devolver hostToken

- url: https://socket.io/docs/v4/server-api/#socketjoinroom
  why: Ya se usa en el código, patrón conocido

- url: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#loading
  why: loading="lazy" para imágenes — atributo nativo, zero-dependency

- url: https://vitejs.dev/guide/env-and-mode.html
  why: import.meta.env.VITE_API_URL en el wrapper de API

- url: https://react.dev/reference/react/createContext
  why: Patrón existente en AuthContext.jsx para extender con token management
```

### Gotchas conocidos del codebase

1. **`socket.js` se instancia UNA SOLA VEZ** en `src/socket.js` y se importa como singleton. No crear nuevas instancias de `io()`.

2. **`main.jsx` llama `socket.connect()` en el arranque** — el socket YA está conectado cuando llega a cualquier página. Algunos componentes también llaman `socket.connect()` defensivamente; esto es seguro con `autoConnect: false`.

3. **`GameRoom.jsx` genera el `roomCode` en el CLIENTE** (línea 38: `Math.floor(100000 + Math.random() * 900000)`). No cambiar esta lógica. El `hostToken` es independiente y lo genera el SERVIDOR.

4. **`HostGame.jsx` recibe `players` y `quizData` vía `location.state`** (desde `GameRoom.jsx` → navigate). El `hostToken` debe pasarse por este mismo mecanismo: `navigate('/host-game/...', { state: { quizData, players, hostToken } })`.

5. **`AuthContext.jsx` actualmente NO maneja el token JWT** — solo controla la visibilidad del modal. El token lo lee cada componente directamente de localStorage. Al moverlo a sessionStorage, hay que actualizar todos los puntos de acceso.

6. **El backend usa el header `"token"` (no `"Authorization: Bearer ..."`)** en las rutas REST:
   ```javascript
   const jwtToken = req.header("token") || req.header("Authorization")?.replace("Bearer ", "");
   ```
   El wrapper `api.js` debe usar `headers: { token: getToken() }`.

7. **`HostGame.jsx` ya tiene `nextLocked = useRef(false)`** (añadido en sesión anterior para el bug de doble clic). No sobreescribir esto.

8. **Toast en `Host.jsx` usa clase `host-toast--${type}`** y Toast en `EditQuiz.jsx` usa clase `eq-toast--${type}`**. El componente compartido debe aceptar un `prefix` prop o usar clases genéricas. Lo más seguro: crear `src/components/common/Toast.jsx` con clases propias (`toast-base--${type}`) y actualizar ambos CSS, **O** mejor — aceptar una prop `className` para el wrapper. Ver la opción recomendada abajo.

9. **`Host.jsx` y `EditQuiz.jsx` tienen sus propios CSS** con las clases `.host-toast` y `.eq-toast`. Para no romper estilos, el Toast compartido debe recibir el `className` del wrapper como prop, o duplicar el CSS mínimo en un archivo compartido. **Recomendación**: usar prop `classPrefix` con valor por defecto `"toast"` y añadir `.toast--success/.toast--error` en `variables.css`.

10. **React 19 + Framer Motion 12** — `AnimatePresence` con `mode="wait"` funciona igual que en v11. No hay breaking changes relevantes para este PRP.

11. **`vite build` bundle analysis**: Actualmente `@supabase/supabase-js` (~300KB gzipped) está en `node_modules` pero el tree-shaker de Vite **no lo eliminará automáticamente** si está en `dependencies` aunque no se importe — sí lo elimina si se analiza correctamente, pero es más seguro eliminarlo de `package.json` para evitar confusión y garantía.

---

## Implementation Blueprint

### FASE 1 — Seguridad Backend (server.js)

#### 1A. Host Token en create_room

```javascript
// En server.js, reemplazar el handler de create_room:
const { randomUUID } = require('crypto'); // Node.js built-in, sin instalación

socket.on("create_room", (roomCode) => {
  const hostToken = randomUUID();
  rooms.set(roomCode, { 
    players: [], 
    currentQuestion: 0, 
    scores: {}, 
    answerCounts: [0, 0, 0, 0],
    hostToken,           // ← NUEVO
    hostSocketId: socket.id  // ← NUEVO: para validaciones adicionales
  });
  socket.join(roomCode);
  socket.emit("room_created", { hostToken }); // ← NUEVO: responde al host
  console.log(`Sala creada: ${roomCode}`);
});
```

#### 1B. Función helper de validación

```javascript
// Añadir ANTES del bloque io.on("connection"):
function validateHostToken(roomCode, hostToken) {
  const room = rooms.get(roomCode);
  if (!room) return false;
  return room.hostToken === hostToken;
}

function sanitizeName(name) {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 20) return null;
  return trimmed;
}

function validateRoomCode(code) {
  return typeof code === 'string' && /^\d{6}$/.test(code);
}
```

#### 1C. Validar eventos privilegiados

```javascript
// send_question — añadir validación:
socket.on("send_question", ({ roomCode, question, time, hostToken }) => {
  const roomStr = roomCode?.toString();
  if (!validateRoomCode(roomStr) || !validateHostToken(roomStr, hostToken)) {
    socket.emit("error", "No autorizado");
    return;
  }
  // ... resto del código existente sin cambios ...
});

// show_results:
socket.on("show_results", ({ roomCode, hostToken }) => {
  // ATENCIÓN: actualmente recibe solo roomCode (string), cambia a objeto
  const roomStr = roomCode?.toString();
  if (!validateRoomCode(roomStr) || !validateHostToken(roomStr, hostToken)) {
    socket.emit("error", "No autorizado");
    return;
  }
  if (rooms.has(roomStr)) rooms.get(roomStr).isAnswering = false;
  io.to(roomStr).emit("reveal_results");
});

// game_over:
socket.on("game_over", ({ roomCode, hostToken }) => {
  // ATENCIÓN: actualmente recibe solo roomCode, cambia a objeto
  const roomStr = roomCode?.toString();
  if (!validateRoomCode(roomStr) || !validateHostToken(roomStr, hostToken)) {
    socket.emit("error", "No autorizado");
    return;
  }
  // ... resto sin cambios ...
});

// cancel_game:
socket.on("cancel_game", ({ roomCode, hostToken }) => {
  // ATENCIÓN: actualmente recibe solo roomCode, cambia a objeto  
  const roomStr = roomCode?.toString();
  if (!validateRoomCode(roomStr) || !validateHostToken(roomStr, hostToken)) {
    socket.emit("error", "No autorizado");
    return;
  }
  io.to(roomStr).emit("game_cancelled");
  rooms.delete(roomStr);
  console.log(`Partida cancelada en sala ${roomStr}`);
});

// join_room — validar inputs:
socket.on("join_room", ({ roomCode, playerName, avatar }) => {
  const roomStr = roomCode?.toString();
  if (!validateRoomCode(roomStr)) {
    socket.emit("error", "Código de sala inválido");
    return;
  }
  const safeName = sanitizeName(playerName);
  if (!safeName) {
    socket.emit("error", "Nombre inválido (1-20 caracteres)");
    return;
  }
  // usar safeName en lugar de playerName para el resto...
  // ... resto sin cambios pero usando safeName ...
});
```

#### 1D. Verificar compatibilidad con start_game

`start_game` no es un evento privilegiado peligroso (solo notifica a los jugadores), pero puedes opcionalmente validar también. Por simplicidad, dejarlo sin validación en esta iteración ya que `game_started` solo es informativo.

---

### FASE 2 — Frontend: Guardar y pasar hostToken

#### 2A. GameRoom.jsx — escuchar room_created y pasar hostToken

```javascript
// En el useEffect de GameRoom.jsx, después de emit("create_room"):
useEffect(() => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  setRoomCode(code);
  
  let hostTokenRef = null; // ← NUEVO

  const createRoom = () => socket.emit("create_room", code);

  if (socket.connected) { createRoom(); } 
  else { socket.once("connect", createRoom); socket.connect(); }

  // ← NUEVO: escuchar la respuesta con el token
  socket.on("room_created", ({ hostToken }) => {
    hostTokenRef = hostToken;
  });

  // ... listeners existentes (update_player_list, player_joined) sin cambios ...

  return () => {
    socket.off("connect", createRoom);
    socket.off("room_created");
    socket.off("update_player_list");
    socket.off("player_joined");
  };
}, []);

// En handleStartGame — pasar hostToken al navegar:
const handleStartGame = () => {
  if (!roomCode || players.length === 0 || isStarting) return;
  setIsStarting(true);
  stopLobby();
  socket.emit("start_game", roomCode);
  navigate(`/host-game/${roomCode}`, { state: { quizData, players, hostToken: hostTokenRef } });
  // NOTA: hostTokenRef es una ref local (no state), necesita ser un ref de React
};
```

**Corrección**: usar `useRef` para `hostTokenRef`:

```javascript
const hostTokenRef = useRef(null);

socket.on("room_created", ({ hostToken }) => {
  hostTokenRef.current = hostToken;
});

// En handleStartGame:
navigate(`/host-game/${roomCode}`, { 
  state: { quizData, players, hostToken: hostTokenRef.current } 
});
```

#### 2B. HostGame.jsx — usar hostToken en eventos privilegiados

```javascript
// Al inicio del componente, extraer hostToken del location.state:
const hostToken = location.state?.hostToken;

// En el useEffect de "New question setup", actualizar emit:
socket.emit("send_question", {
  roomCode,
  question: q,
  time: q.time || 20,
  hostToken, // ← AÑADIR
});

// En handleExitGame:
socket.emit("cancel_game", { roomCode, hostToken }); // ← cambio de string a objeto

// En el useEffect de "Emit show_results":
socket.emit("show_results", { roomCode, hostToken }); // ← cambio de string a objeto

// Al navegar al podio (handleNext, última pregunta):
// El socket game_over se emite en el Podium.jsx — revisar ese archivo también
```

#### 2C. Verificar Podium.jsx — emit game_over

```javascript
// Leer el archivo Podium.jsx y verificar dónde emite game_over
// Pasar hostToken desde location.state al emit
```

---

### FASE 3 — Mantenimiento Frontend

#### 3A. Crear src/utils/api.js

```javascript
// src/utils/api.js
const BASE = import.meta.env.VITE_API_URL;

function getToken() {
  return sessionStorage.getItem("token"); // ← sessionStorage en lugar de localStorage
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { token } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  return res;
}

export { getToken };
```

**IMPORTANTE**: Para `/upload` (FormData), no incluir `Content-Type` en el header para que el browser lo ponga con el boundary correcto:

```javascript
export async function apiUpload(path, formData) {
  const token = getToken();
  const headers = token ? { token } : {};
  return fetch(`${BASE}${path}`, { method: "POST", headers, body: formData });
}
```

#### 3B. Mover token a sessionStorage + actualizar AuthContext

`AuthContext.jsx` actualmente solo maneja el modal. Añadir funciones de auth:

```javascript
// src/context/AuthContext.jsx — añadir:
const login = (token, email) => {
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("userEmail", email);
};

const logout = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userEmail");
};

const getUser = () => ({
  token: sessionStorage.getItem("token"),
  email: sessionStorage.getItem("userEmail"),
});

const isLoggedIn = () => !!sessionStorage.getItem("token");

// Exponer en el value del Provider
```

Luego actualizar:
- `AuthModal.jsx`: usar `login(data.token, data.user.email)` del contexto
- `Host.jsx`: usar `logout()` del contexto en `handleLogout`, usar `getUser().token` en fetches
- `EditQuiz.jsx`: usar `getUser().token`
- Reemplazar todos los `localStorage.getItem("token")` y `localStorage.setItem("token")`

#### 3C. Crear src/components/common/Toast.jsx

```javascript
// src/components/common/Toast.jsx
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
```

Uso en Host.jsx: `<Toast classPrefix="host-toast" .../>` — mantiene las clases CSS existentes.
Uso en EditQuiz.jsx: `<Toast classPrefix="eq-toast" .../>` — idem.

#### 3D. Crear src/components/common/Spinner.jsx

```javascript
// src/components/common/Spinner.jsx
export function Spinner({ className = "spinner" }) {
  return <span className={className} aria-hidden="true" />;
}
```

Uso en Host.jsx: `<Spinner className="host-spinner"/>` (verificar clase CSS actual).
Uso en EditQuiz.jsx: `<Spinner className="eq-spinner"/>`.

#### 3E. Crear src/constants/game.js

```javascript
// src/constants/game.js
export const OPTION_BG     = ["#EDA35A", "#A50E24", "#9195F6", "#574964"];
export const OPTION_SHADOW = ["#C68848", "#7D0A1B", "#7579CA", "#3E3447"];
export const OPTION_LETTER = ["A", "B", "C", "D"];
```

Luego en `HostGame.jsx` y `GameController.jsx`:
```javascript
import { OPTION_BG, OPTION_SHADOW, OPTION_LETTER } from "../constants/game";
// eliminar las declaraciones locales de las 3 constantes
```

#### 3F. Eliminar paquetes no usados

```bash
cd /Users/arielgonzalez/cyraquiz-frontend-main
npm uninstall @supabase/supabase-js clsx react-intersection-observer
```

Verificar antes de ejecutar:
- `@supabase/supabase-js`: grep confirma CERO importaciones en `src/`
- `clsx`: grep confirma CERO importaciones en `src/`
- `react-intersection-observer`: grep confirma CERO importaciones. `whileInView` es prop de Framer Motion, no requiere este paquete.

---

### FASE 4 — Rendimiento Frontend

#### 4A. Lazy loading en selector de avatares (Join.jsx)

```javascript
// En Join.jsx, dentro del avatar grid modal (línea ~312):
<img
  src={`/avatars/${img}`}
  alt={img.replace('.png', '')}
  className="join-avatar-option-img"
  loading="lazy"   // ← AÑADIR
  width="64"       // ← AÑADIR (dimensiones exactas de display)
  height="64"      // ← AÑADIR
/>
```

El modal solo es visible cuando el usuario hace click, por lo que `loading="lazy"` deja de cargar las imágenes hasta que el modal abre y el browser ve los `<img>` tags en el DOM visible. Esto reduce de 48 peticiones simultáneas al inicio a ~0.

**Verificar también** las imágenes de avatar en `GameRoom.jsx` (player list):
```javascript
// GameRoom.jsx línea ~241 - ya tiene loading="lazy" ✓
<img src={player.avatar} alt="" loading="lazy" .../>
```

#### 4B. Paginación simple en Host.jsx

```javascript
// En Host.jsx, añadir estado de paginación:
const QUIZZES_PER_PAGE = 12;
const [currentPage, setCurrentPage] = useState(1);

// En lugar de filteredQuizzes.map:
const totalPages = Math.ceil(filteredQuizzes.length / QUIZZES_PER_PAGE);
const paginatedQuizzes = filteredQuizzes.slice(
  (currentPage - 1) * QUIZZES_PER_PAGE,
  currentPage * QUIZZES_PER_PAGE
);

// Reset a página 1 cuando cambia searchTerm:
useEffect(() => { setCurrentPage(1); }, [searchTerm]);

// Renderizar paginatedQuizzes en lugar de filteredQuizzes
// Añadir controles de paginación debajo del grid (solo si totalPages > 1)
```

**UI de paginación** (mínima, dentro del diseño actual):
```jsx
{totalPages > 1 && (
  <div className="host-pagination">
    <button
      className="host-pagination-btn"
      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
      disabled={currentPage === 1}
    >
      ‹
    </button>
    <span className="host-pagination-info">
      {currentPage} / {totalPages}
    </span>
    <button
      className="host-pagination-btn"
      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
      disabled={currentPage === totalPages}
    >
      ›
    </button>
  </div>
)}
```

Añadir estilos mínimos en `Host.css`:
```css
.host-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px 0;
}
.host-pagination-btn {
  background: var(--bg-card);
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-heading);
  transition: var(--transition);
}
.host-pagination-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}
.host-pagination-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.host-pagination-info {
  font-family: var(--font-heading);
  font-weight: 600;
  color: var(--text-main);
  min-width: 48px;
  text-align: center;
}
```

---

## Task List (Orden de Ejecución)

Completar en este orden exacto. Marcar como completado antes de pasar al siguiente.

### SEGURIDAD BACKEND

- [ ] **T1**: Leer `server.js` completo para contexto
- [ ] **T2**: Añadir `require('crypto')` al inicio de `server.js`
- [ ] **T3**: Añadir funciones helper `validateHostToken`, `sanitizeName`, `validateRoomCode` antes de `io.on("connection")`
- [ ] **T4**: Actualizar handler `create_room` para generar y almacenar `hostToken` + emitir `room_created`
- [ ] **T5**: Actualizar handler `join_room` para validar roomCode y sanitizar playerName
- [ ] **T6**: Actualizar handler `send_question` para requerir y validar hostToken
- [ ] **T7**: Actualizar handler `show_results` para recibir objeto `{roomCode, hostToken}` en lugar de string
- [ ] **T8**: Actualizar handler `game_over` para recibir objeto `{roomCode, hostToken}`
- [ ] **T9**: Actualizar handler `cancel_game` para recibir objeto `{roomCode, hostToken}`
- [ ] **T10**: Reiniciar backend y verificar con curl que el servidor arranca

### SEGURIDAD FRONTEND — Token hostToken

- [ ] **T11**: Leer `GameRoom.jsx` completo
- [ ] **T12**: Añadir `hostTokenRef = useRef(null)` en GameRoom.jsx
- [ ] **T13**: Añadir listener `socket.on("room_created", ...)` en GameRoom.jsx
- [ ] **T14**: Actualizar `handleStartGame` para pasar `hostToken` en navigate state
- [ ] **T15**: Leer `HostGame.jsx` completo
- [ ] **T16**: Extraer `hostToken` de `location.state` en HostGame.jsx
- [ ] **T17**: Actualizar `send_question` emit en HostGame.jsx para incluir `hostToken`
- [ ] **T18**: Actualizar `show_results` emit en HostGame.jsx
- [ ] **T19**: Actualizar `cancel_game` emit en HostGame.jsx
- [ ] **T20**: Leer `Podium.jsx` y actualizar `game_over` emit si existe (pasar hostToken desde location.state)

### MANTENIMIENTO — API util + Auth centralizado

- [ ] **T21**: Crear `src/utils/api.js` con `apiFetch` y `apiUpload`
- [ ] **T22**: Leer `AuthContext.jsx` completo
- [ ] **T23**: Añadir `login`, `logout`, `getUser`, `isLoggedIn` a AuthContext
- [ ] **T24**: Leer `AuthModal.jsx` y actualizar para usar `login()` del contexto + `apiFetch`
- [ ] **T25**: Leer `Host.jsx` y actualizar: usar `logout()`, usar `apiFetch`/`apiUpload`, usar `getUser().email`
- [ ] **T26**: Leer `EditQuiz.jsx` y actualizar para usar `apiFetch` y `getUser().token`

### MANTENIMIENTO — Componentes compartidos

- [ ] **T27**: Crear `src/components/common/Toast.jsx`
- [ ] **T28**: Crear `src/components/common/Spinner.jsx`
- [ ] **T29**: Actualizar `Host.jsx`: eliminar Toast/Spinner inline, importar los compartidos con `classPrefix="host-toast"` y `className="host-spinner"`
- [ ] **T30**: Actualizar `EditQuiz.jsx`: eliminar Toast/Spinner inline, importar los compartidos
- [ ] **T31**: Crear `src/constants/game.js` con las 3 constantes
- [ ] **T32**: Actualizar `HostGame.jsx`: eliminar constantes locales, importar de `constants/game.js`
- [ ] **T33**: Actualizar `GameController.jsx`: eliminar constantes locales, importar de `constants/game.js`
- [ ] **T34**: Desinstalar paquetes no usados: `npm uninstall @supabase/supabase-js clsx react-intersection-observer`
- [ ] **T35**: Verificar que el build no falla: `npm run build`

### RENDIMIENTO

- [ ] **T36**: Añadir `loading="lazy"` a imágenes en avatar grid de `Join.jsx` (modal de selección)
- [ ] **T37**: Añadir paginación en `Host.jsx` (estado + lógica de slice)
- [ ] **T38**: Añadir estilos de paginación en `Host.css`

### VALIDACIÓN FINAL

- [ ] **T39**: Probar flujo completo: login → crear sala → unirse como estudiante → jugar → podio
- [ ] **T40**: Verificar en DevTools Network que avatares no se cargan antes de abrir el modal
- [ ] **T41**: Verificar en DevTools Console que no hay errores de socket
- [ ] **T42**: Verificar en DevTools Network que `@supabase` NO aparece en el bundle (chunk analysis)

---

## Validation Gates

Ejecutar en orden. Cada gate debe pasar antes de continuar.

### Gate 1: Backend arranca correctamente

```bash
cd /Users/arielgonzalez/cyraquiz-backend
node src/server.js &
sleep 2
curl -s http://localhost:4000/health | grep -q "ok" && echo "✅ Backend OK" || echo "❌ Backend FAILED"
kill %1
```

### Gate 2: Frontend compila sin errores

```bash
cd /Users/arielgonzalez/cyraquiz-frontend-main
npm run build 2>&1 | tail -5
```

Debe terminar con `✓ built in X.XXs` sin errores.

### Gate 3: Paquetes eliminados no están en el bundle

```bash
cd /Users/arielgonzalez/cyraquiz-frontend-main
npm run build 2>&1 | grep -E "supabase|clsx|intersection" || echo "✅ Paquetes no usados eliminados del bundle"
```

### Gate 4: No hay referencias a localStorage para token

```bash
grep -rn "localStorage.*token\|localStorage.*userEmail" \
  /Users/arielgonzalez/cyraquiz-frontend-main/src \
  --include="*.jsx" --include="*.js" \
  && echo "❌ Todavía hay referencias a localStorage para token" \
  || echo "✅ Token movido a sessionStorage"
```

### Gate 5: Constantes de juego en un solo lugar

```bash
echo "=== Ocurrencias de OPTION_BG ==="
grep -rn "OPTION_BG" /Users/arielgonzalez/cyraquiz-frontend-main/src --include="*.jsx" --include="*.js"
# Debe aparecer SOLO en: constants/game.js (definición) + HostGame.jsx e GameController.jsx (import)
# NO debe aparecer como `const OPTION_BG = [...]` en más de 1 archivo
```

### Gate 6: Toast componente no duplicado

```bash
grep -rn "function Toast\|const Toast" \
  /Users/arielgonzalez/cyraquiz-frontend-main/src \
  --include="*.jsx" --include="*.js"
# Debe aparecer SOLO en: src/components/common/Toast.jsx
```

### Gate 7: lint sin errores

```bash
cd /Users/arielgonzalez/cyraquiz-frontend-main
npm run lint 2>&1 | tail -10
```

### Gate 8: Flujo de autenticación funciona

```bash
curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arielvisuals.me@outlook.com","password":"TU_PASSWORD"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ Login OK' if 'token' in d else '❌ Login FAILED')"
```

---

## Known Risks

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| `show_results` y `game_over` actualmente reciben string, no objeto | Alta | Cambiar backend Y frontend simultáneamente en T7-T9 |
| `hostToken` se pierde si el host recarga la página | Media | Es comportamiento esperado — si el host recarga, la sala ya no existe de todas formas |
| sessionStorage se borra al cerrar la pestaña | Baja | Comportamiento deseado: más seguro. El usuario simplemente inicia sesión de nuevo |
| Eliminar paquetes puede romper imports indirectos | Baja | Verificado con grep. Solo `canvas-confetti` está en Podium.jsx (no se elimina) |
| Paginación resetea al buscar | Ninguno | Manejado con `useEffect(() => setCurrentPage(1), [searchTerm])` |

---

## Files to Create

```
src/utils/api.js                    (NUEVO)
src/constants/game.js               (NUEVO)  
src/components/common/Toast.jsx     (NUEVO)
src/components/common/Spinner.jsx   (NUEVO)
```

## Files to Modify

```
Backend:
  cyraquiz-backend/src/server.js    ← host tokens + validación

Frontend:
  src/context/AuthContext.jsx       ← añadir login/logout/getUser
  src/components/auth/AuthModal.jsx ← usar AuthContext.login + apiFetch
  src/pages/Host.jsx                ← usar apiFetch + AuthContext + Toast/Spinner compartidos + paginación
  src/pages/EditQuiz.jsx            ← usar apiFetch + AuthContext + Toast/Spinner compartidos
  src/pages/GameRoom.jsx            ← escuchar room_created, pasar hostToken
  src/pages/HostGame.jsx            ← usar hostToken en eventos privilegiados
  src/pages/Podium.jsx              ← pasar hostToken a game_over (si aplica)
  src/pages/Join.jsx                ← loading="lazy" en avatar grid
  src/styles/Host.css               ← estilos de paginación
  package.json                      ← eliminar 3 paquetes no usados
```

## Files NOT to Touch

```
src/socket.js                 ← instancia global correcta, no modificar
src/main.jsx                  ← rutas correctas, no modificar
src/styles/variables.css      ← design tokens, no modificar
src/styles/*.css              ← NO tocar CSS existente, solo añadir .host-pagination
public/avatars/               ← NO optimizar imágenes en este PRP
```

---

## Score: 8/10

**Confianza**: Las tareas son incrementales y verificables. Los riesgos más altos (cambio de firma de eventos socket) son manejables si se hacen frontend+backend en la misma sesión. La mayor fuente de riesgo es olvidar actualizar alguno de los 3 eventos que cambian de `string` a `{roomCode, hostToken}`.

**Por qué no 10/10**: El PRP requiere modificar backend y frontend coordinadamente. Si un gate falla (p.ej. `show_results` no pasa el token), hay que hacer debugging bidireccional. Las instrucciones son suficientemente detalladas para que un agente lo resuelva solo.
