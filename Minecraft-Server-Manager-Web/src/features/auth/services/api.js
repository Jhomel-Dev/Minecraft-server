export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function loginWithCredentials(email, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include', 
  });
  if (!res.ok) throw new Error('Invalid credentials');
  return res.json(); 
}

export async function registerWithCredentials(username, email, password) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json();
}

export async function loginWithGoogle(credentialOrToken, isAccessToken = false) {
  const bodyData = isAccessToken ? { accessToken: credentialOrToken } : { credential: credentialOrToken };
  
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyData),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Google authentication failed');
  return res.json();
}

export async function refreshAccessToken() {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('SessionExpired');
    }
    throw new Error('Refresh failed');
  }
  return res.json();
}

export async function getAgentToken() {
  const res = await fetch(`${API_URL}/api/auth/me/agent-token`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch agent token');
  return res.json();
}
