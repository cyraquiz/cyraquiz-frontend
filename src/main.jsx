import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles/variables.css";
import "./index.css";

import { AuthProvider } from "./context/AuthContext.jsx";
import AuthModal from "./components/auth/AuthModal.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import { Spinner } from "./components/common/Spinner.jsx";

// Student-critical path: eager imports — zero Suspense/Promise overhead on navigation
import Join         from "./pages/Join.jsx";
import StudentLobby from "./pages/StudentLobby.jsx";
import GameController from "./pages/GameController.jsx";

// Wraps lazy() so a stale-deployment chunk-load failure triggers a hard reload
// instead of leaving a blank screen. Happens when Vercel re-hashes chunks after
// a new deploy while the user still has the old HTML cached.
function lazyWithReload(fn) {
  return lazy(() =>
    fn().catch((err) => {
      if (!sessionStorage.getItem("chunk_reload")) {
        sessionStorage.setItem("chunk_reload", "1");
        window.location.reload();
      }
      throw err;
    })
  );
}

const GhostMode          = lazyWithReload(() => import("./pages/GhostMode.jsx"));
const Host               = lazyWithReload(() => import("./pages/Host.jsx"));
const EditQuiz           = lazyWithReload(() => import("./pages/EditQuiz.jsx"));
const GameRoom           = lazyWithReload(() => import("./pages/GameRoom.jsx"));
const HostGame           = lazyWithReload(() => import("./pages/HostGame.jsx"));
const Podium             = lazyWithReload(() => import("./pages/Podium.jsx"));
const StudentAssignment  = lazyWithReload(() => import("./pages/StudentAssignment.jsx"));
const AssignmentsPage    = lazyWithReload(() => import("./pages/AssignmentsPage.jsx"));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/join" element={<Join />} />
            <Route path="/ghost" element={<GhostMode />} />
            <Route path="/host" element={<Host />} />
            <Route path="/student/lobby/:pin" element={<StudentLobby />} />
            <Route path="/edit/:id" element={<EditQuiz />} />
            <Route path="/room/:id" element={<GameRoom />} />
            <Route path="/host-game/:roomCode" element={<HostGame />} />
            <Route path="/game/:pin" element={<GameController />} />
            <Route path="/podium/:roomCode" element={<Podium />} />
            <Route path="/asignacion/:token" element={<StudentAssignment />} />
            <Route path="/tareas" element={<AssignmentsPage />} />
          </Routes>
        </Suspense>
        <AuthModal />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);