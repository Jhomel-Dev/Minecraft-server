import { API_URL, refreshAccessToken } from "@/features/auth/services/api";

const getHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` })
  };
};

let isRefreshing = false;
let refreshPromise = null;

const authFetch = async (endpoint, options = {}) => {
  let res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers }
  });

  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken()
        .then((data) => {
          if (data.token) {
            localStorage.setItem("accessToken", data.token);
            return data.token;
          }
          throw new Error("No token returned");
        })
        .catch((err) => {
          if (err.message === 'SessionExpired') {
            localStorage.removeItem("accessToken");
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
        headers: { ...getHeaders(), ...options.headers }
      });
    } catch (err) {
      // Return a pending promise to halt execution and avoid React unhandled errors while window.location redirects
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
  // 1. Send the stop command
  await stopServer(id);
  
  // 2. Poll until the server status actually becomes OFFLINE
  let isOffline = false;
  for (let i = 0; i < 30; i++) { // wait up to 30 seconds
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

  // 3. Start the server again
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
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_URL}/api/servers/${id}/backups/${fileName}/download`, {
    headers: { 'Authorization': `Bearer ${token}` }
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
