import { io } from "socket.io-client";
import { TOKEN_KEY, WS_BASE } from "./api";

let socket = null;

export function getSocket() {
    if (socket && socket.connected) return socket;
    if (!socket) {
        socket = io(WS_BASE, {
            path: "/socket.io",
            transports: ["websocket", "polling"],
            auth: { token: localStorage.getItem(TOKEN_KEY) || "" },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 800,
        });
    }
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
