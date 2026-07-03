import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { API_URL } from "@/features/auth/services/api";

export function useServerMetrics(serverId) {
  const [metrics, setMetrics] = useState({ cpu: 0, memory: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!serverId) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const socket = io(API_URL, {
      auth: { jwt: token },
      transports: ["websocket"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      // We need to join the server room so we get TELEMETRY broadcasts
      socket.emit("JOIN_SERVER_CONSOLE", serverId); 
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("TELEMETRY", (stats) => {
      if (!stats) return;
      setMetrics({
        cpu: stats.cpu || 0,
        memory: stats.memory || 0
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [serverId]);

  return { metrics, isConnected };
}
