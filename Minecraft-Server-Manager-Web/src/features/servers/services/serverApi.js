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
          localStorage.removeItem("accessToken");
          window.location.href = "/login";
          throw err;
        })
        .finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
    }

    try {
      await refreshPromise;
      // Reintentar la petición original con el nuevo token
      res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { ...getHeaders(), ...options.headers }
      });
    } catch (err) {
      throw new Error("Session expired");
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
  await new Promise(resolve => setTimeout(resolve, 3000));
  return await startServer(id);
}

export async function fsOperation(id, payload) {
  return authFetch(`/api/servers/${id}/fs`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getMyServers() {
  return authFetch(`/api/servers`, {
    method: "GET"
  });
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
