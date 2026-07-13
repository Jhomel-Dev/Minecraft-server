import { useEffect, useState } from "react";
import { getMyServers, fsOperation } from "@/features/servers/services/serverApi";
import { useRouter } from "next/navigation";

export function useServers() {
  const [servers, setServers] = useState([]);
  const [serverSizes, setServerSizes] = useState({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadServerSize = async (serverId) => {
    try {
      const res = await fsOperation(serverId, { action: "size", filePath: "." });
      if (res && res.size !== undefined) {
        setServerSizes(prev => ({ ...prev, [serverId]: res.size }));
      }
    } catch {}
  };

  const loadServers = async (isInitial = false) => {
    try {
      const data = await getMyServers();
      const serverList = Array.isArray(data) ? data : [];
      
      if (isInitial && serverList.length === 0) {
        router.push("/servers/new-server");
        return;
      }
      
      setServers(serverList);
      if (isInitial) {
        serverList.forEach(server => loadServerSize(server.id));
      }
    } catch {
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadServers(true);
    const interval = setInterval(() => loadServers(false), 3000);
    return () => clearInterval(interval);
  }, [router]);

  const formatSize = (bytes) => {
    if (bytes === undefined || bytes === null) return "Calculando...";
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) return (mb / 1024).toFixed(2) + " GB";
    return mb.toFixed(2) + " MB";
  };

  return { servers, serverSizes, loading, formatSize };
}
