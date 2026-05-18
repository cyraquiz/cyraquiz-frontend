import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_API_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

socket.on("connect_error", (err) => {
  if (import.meta.env.DEV) console.warn("Socket error:", err.message);
});
