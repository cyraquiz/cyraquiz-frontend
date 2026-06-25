import { io } from "socket.io-client";
import { resolveServerUrl } from "./utils/url";

export const socket = io(resolveServerUrl(), {
  autoConnect: false,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 8000,
  reconnectionAttempts: Infinity,
});

socket.on("connect_error", (err) => {
  if (import.meta.env.DEV) console.warn("[socket] connect_error:", err.message);
});
