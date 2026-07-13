import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { API_URL } from "@/features/auth/services/api";

export function useServerConsole(serverId) {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!serverId) return;

    const socket = io(API_URL, {
      withCredentials: true,
      transports: ["websocket"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("JOIN_SERVER_CONSOLE", serverId);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("CONSOLE_LOG_HISTORY", (history) => {
      if (!Array.isArray(history)) return;
      setLogs(history);
    });

    socket.on("CONSOLE_LOG", (log) => {
      if (!log) return;
      setLogs((prev) => [...prev, log].slice(-200));
    });

    return () => {
      socket.disconnect();
    };
  }, [serverId]);

  const sendCommand = (command) => {
    if (!command) return;
    if (!command.trim()) return;
    if (!socketRef.current) return;
    
    socketRef.current.emit("SEND_COMMAND", { serverId, command });
  };

  const clearLogs = () => {
    setLogs([]);
    if (socketRef.current) {
      socketRef.current.emit("CLEAR_SERVER_CONSOLE", serverId);
    }
  };

  return { logs, isConnected, sendCommand, clearLogs };
}
