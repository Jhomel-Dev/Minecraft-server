export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function loginWithCredentials(email, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'omit', 
  });
  if (!res.ok) throw new Error('Invalid credentials');
  return res.json(); 
}

export async function registerWithCredentials(username, email, password) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
    credentials: 'omit',
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json();
}

export async function loginWithGoogle(credential) {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
    credentials: 'omit',
  });
  if (!res.ok) throw new Error('Google authentication failed');
  return res.json();
}
