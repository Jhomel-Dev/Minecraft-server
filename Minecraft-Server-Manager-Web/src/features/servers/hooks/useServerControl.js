import { useState, useEffect } from "react";
import { getMyServers, startServer, stopServer, restartServer } from "@/features/servers/services/serverApi";

export function useServerControl(serverId) {
  const [server, setServer] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchServer = async () => {
    try {
      const data = await getMyServers();
      const serverList = Array.isArray(data) ? data : [];
      const found = serverList.find(s => s.id === serverId);
      if (found) setServer(found);
    } catch {}
  };

  useEffect(() => {
    fetchServer();
    const interval = setInterval(fetchServer, 3000);
    return () => clearInterval(interval);
  }, [serverId]);

  const handleError = (err) => {
    setErrorMsg(err.message || "Ha ocurrido un error inesperado.");
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const handleStart = async () => { 
    setErrorMsg(null);
    await startServer(serverId).catch(handleError); 
    fetchServer();
  };
  
  const handleStop = async () => { 
    setErrorMsg(null);
    await stopServer(serverId).catch(handleError); 
    fetchServer();
  };
  
  const handleRestart = async () => { 
    setErrorMsg(null);
    await restartServer(serverId).catch(handleError); 
    fetchServer();
  };

  const clearError = () => setErrorMsg(null);

  return {
    server,
    errorMsg,
    clearError,
    handleStart,
    handleStop,
    handleRestart
  };
}
