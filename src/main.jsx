import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/variables.css";
import "./index.css";

import { AuthProvider } from "./context/AuthContext.jsx";
import AuthModal from "./components/auth/AuthModal.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import EditQuiz from "./pages/EditQuiz.jsx";
import GameRoom from "./pages/GameRoom.jsx";
import HostGame from "./pages/HostGame.jsx";
import GameController from "./pages/GameController.jsx";
import Podium from "./pages/Podium.jsx";
import Host from "./pages/Host.jsx";
import Join from "./pages/Join.jsx";
import StudentLobby from "./pages/StudentLobby.jsx";
import { socket } from "./socket";

socket.connect();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/join" element={<Join />} />
          <Route path="/host" element={<Host />} />
          <Route path="/student/lobby/:pin" element={<StudentLobby />} />
          <Route path="/edit/:id" element={<EditQuiz />} />
          <Route path="/room/:id" element={<GameRoom />} />
          <Route path="/host-game/:roomCode" element={<HostGame />} />
          <Route path="/game/:pin" element={<GameController />} />
          <Route path="/podium/:roomCode" element={<Podium />} />
        </Routes>
        <AuthModal />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);