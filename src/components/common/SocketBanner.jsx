import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { socket } from "../../socket";

export function SocketBanner() {
  const [connected,    setConnected]    = useState(socket.connected);
  const [wasConnected, setWasConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect    = () => { setConnected(true); setWasConnected(true); };
    const onDisconnect = () => setConnected(false);
    socket.on("connect",    onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect",    onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  // Solo mostrar si el socket llegó a conectarse y luego cayó
  if (!wasConnected || connected) return null;

  return createPortal(
    <div className="socket-banner" role="alert" aria-live="assertive">
      <span className="socket-banner-dot" aria-hidden="true" />
      Sin conexión — reconectando…
    </div>,
    document.body
  );
}
