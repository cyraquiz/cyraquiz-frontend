import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles/variables.css";
import "./index.css";

import { AuthProvider } from "./context/AuthContext.jsx";
import AuthModal from "./components/auth/AuthModal.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import { Spinner } from "./components/common/Spinner.jsx";

const Join          = lazy(() => import("./pages/Join.jsx"));
const GhostMode     = lazy(() => import("./pages/GhostMode.jsx"));
const Host          = lazy(() => import("./pages/Host.jsx"));
const EditQuiz      = lazy(() => import("./pages/EditQuiz.jsx"));
const GameRoom      = lazy(() => import("./pages/GameRoom.jsx"));
const HostGame      = lazy(() => import("./pages/HostGame.jsx"));
const GameController = lazy(() => import("./pages/GameController.jsx"));
const StudentLobby  = lazy(() => import("./pages/StudentLobby.jsx"));
const Podium             = lazy(() => import("./pages/Podium.jsx"));
const StudentAssignment  = lazy(() => import("./pages/StudentAssignment.jsx"));
const AssignmentsPage    = lazy(() => import("./pages/AssignmentsPage.jsx"));

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