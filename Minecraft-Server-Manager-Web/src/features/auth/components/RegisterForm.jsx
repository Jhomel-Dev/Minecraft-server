"use client";
import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import Link from "next/link";
import { useAuthStore } from "../store/authStore";
import { registerWithCredentials, loginWithGoogle } from "../services/api";
import { useRouter } from "next/navigation";
import { Pickaxe } from "lucide-react";

export function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore(s => s.setUser);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await registerWithCredentials(username, email, password);
      // Usually register returns the user and we might auto-login or redirect to login.
      // Let's assume the backend logs them in and returns a token.
      if (data.user) setUser(data.user);
      if (data.token) {
        window.location.href = "/servers";
      }
      router.push("/servers");
    } catch (err) {
      setError("No se pudo crear la cuenta. Inténtalo con otro correo o usuario.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const data = await loginWithGoogle(tokenResponse.access_token, true);
        setUser(data.user);
        if(data.token) {
          window.location.href = "/servers";
        }
        router.push("/servers");
      } catch (err) {
        setError("Error autenticando con Google. Inténtalo más tarde.");
      }
    },
    onError: () => setError("Error conectando con Google")
  });

  return (
    <div className="bg-surface border-2 border-surface-border p-8 rounded-blocky shadow-xl max-w-md w-full flex flex-col gap-6 z-10">
      
      <div className="flex flex-col items-center text-center gap-2">
        <div className="p-3 bg-background rounded-blocky border-2 border-surface-border mb-2">
          <Pickaxe className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-black text-foreground">Crear cuenta</h1>
        <p className="text-foreground/70 text-sm">Únete para empezar a crear tus servidores</p>
      </div>

      {error && (
        <div className="bg-danger/10 border-2 border-danger text-danger p-3 rounded-blocky text-sm font-semibold text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <Input 
          type="text" 
          placeholder="Nombre de usuario" 
          value={username} onChange={e => setUsername(e.target.value)}
          required
          disabled={loading}
        />
        <Input 
          type="email" 
          placeholder="Correo electrónico" 
          value={email} onChange={e => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        <Input 
          type="password" 
          placeholder="Contraseña" 
          value={password} onChange={e => setPassword(e.target.value)}
          required
          disabled={loading}
        />
        <Button type="submit" variant="primary" className="mt-2 h-12 text-lg" disabled={loading}>
          {loading ? "Creando..." : "Registrarse"}
        </Button>
      </form>

      <div className="flex items-center gap-4">
        <div className="h-0.5 bg-surface-border flex-1" />
        <span className="text-surface-border font-bold text-sm">O ENTRA CON</span>
        <div className="h-0.5 bg-surface-border flex-1" />
      </div>

      <div className="flex justify-center">
        <Button 
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-2 h-12 bg-surface hover:bg-surface-hover border-2 border-surface-border text-foreground font-bold"
          onClick={() => handleCustomGoogleLogin()}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            <path d="M1 1h22v22H1z" fill="none"/>
          </svg>
          Registrarse con Google
        </Button>
      </div>

      <p className="text-center text-sm text-foreground/70 mt-2">
        ¿Ya tienes una cuenta?{" "}
        <Link href="/login" className="text-primary font-bold hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
