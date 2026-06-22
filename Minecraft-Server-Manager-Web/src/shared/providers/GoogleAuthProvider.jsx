"use client";
import { GoogleOAuthProvider } from "@react-oauth/google";

export function GoogleAuthProvider({ children }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "1035705830951-mtus4mqkdgp6rg4qjnrhbm6ftbg28q6f.apps.googleusercontent.com";
  
  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
