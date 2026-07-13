import { API_URL, refreshAccessToken } from "@/features/auth/services/api";

const getHeaders = () => {
  return {
    "Content-Type": "application/json"
  };
};

let isRefreshing = false;
let refreshPromise = null;

const authFetch = async (endpoint, options = {}) => {
  let res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: { ...getHeaders(), ...options.headers }
  });

  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken()
        .then((data) => {
          return true;
        })
        .catch((err) => {
          if (err.message === 'SessionExpired') {
            window.location.href = "/login";
          }
          throw err;
        })
        .finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
    }

    try {
      await refreshPromise;
      res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: { ...getHeaders(), ...options.headers }
      });
    } catch (err) {
      
      return new Promise(() => {}); 
    }
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "API Request Failed");
  }

  return res.json();
};

export async function createServer(data) {
  return authFetch(`/api/servers/create`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function startServer(id) {
  return authFetch(`/api/servers/${id}/start`, {
    method: "POST"
  });
}

export async function stopServer(id) {
  return authFetch(`/api/servers/${id}/stop`, {
    method: "POST"
  });
}

export async function restartServer(id) {
  
  await stopServer(id);
  
  
  let isOffline = false;
  for (let i = 0; i < 30; i++) { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const servers = await getMyServers();
      const server = servers.find(s => s.id === id);
      if (server && server.status === 'OFFLINE') {
        isOffline = true;
        break;
      }
    } catch (e) {
      console.warn("Error polling server status during restart:", e);
    }
  }

  if (!isOffline) {
    throw new Error("El servidor tardó demasiado en detenerse. No se pudo reiniciar automáticamente.");
  }

  
  return await startServer(id);
}

export async function fsOperation(id, payload) {
  return authFetch(`/api/servers/${id}/fs`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getPlayers(id) {
  return authFetch(`/api/servers/${id}/players`, {
    method: "GET"
  });
}

export async function getMyServers() {
  return authFetch(`/api/servers`, {
    method: "GET"
  });
}

export async function getBackups(id) {
  return authFetch(`/api/servers/${id}/backups`, {
    method: "GET"
  });
}

export async function createBackup(id, profile) {
  return authFetch(`/api/servers/${id}/backups`, {
    method: "POST",
    body: JSON.stringify({ profile })
  });
}

export async function deleteBackup(id, fileName) {
  return authFetch(`/api/servers/${id}/backups/${fileName}`, {
    method: "DELETE"
  });
}

export async function downloadBackupZip(id, fileName) {
  const res = await fetch(`${API_URL}/api/servers/${id}/backups/${fileName}/download`, {
    credentials: "include"
  });
  if (!res.ok) throw new Error("No se pudo descargar el backup");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function updateSettings(id, data) {
  return authFetch(`/api/servers/${id}/settings`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deleteServer(id, keepFiles = false) {
  return authFetch(`/api/servers/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ keepFiles })
  });
}

export async function sendCommand(id, command) {
  return authFetch(`/api/servers/${id}/command`, {
    method: "POST",
    body: JSON.stringify({ command })
  });
}
