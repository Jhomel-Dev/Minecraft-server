"use client";
import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import Link from "next/link";
import { useAuthStore } from "../store/authStore";
import { loginWithCredentials, loginWithGoogle } from "../services/api";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { Pickaxe } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore(s => s.setUser);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginWithCredentials(email, password);
      setUser(data.user);
      if(data.token) localStorage.setItem("accessToken", data.token);
      router.push("/servers");
    } catch (err) {
      setError("Credenciales inválidas. Verifica tu correo y contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response) => {
    try {
      const data = await loginWithGoogle(response.credential);
      setUser(data.user);
      if(data.token) localStorage.setItem("accessToken", data.token);
      router.push("/servers");
    } catch (err) {
      setError("Error autenticando con Google. Inténtalo más tarde.");
    }
  };

  return (

      <div className="bg-surface border-2 border-surface-border p-8 rounded-blocky shadow-xl max-w-md w-full flex flex-col gap-6 z-10">
        
        <div className="flex flex-col items-center text-center gap-2">
          <div className="p-3 bg-background rounded-blocky border-2 border-surface-border mb-2">
            <Pickaxe className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-black text-foreground">Bienvenido de vuelta</h1>
          <p className="text-foreground/70 text-sm">Inicia sesión para controlar tus servidores</p>
        </div>

        {error && (
          <div className="bg-danger/10 border-2 border-danger text-danger p-3 rounded-blocky text-sm font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
            {loading ? "Iniciando..." : "Entrar a CraftControl"}
          </Button>
        </form>

        <div className="flex items-center gap-4">
          <div className="h-0.5 bg-surface-border flex-1" />
          <span className="text-surface-border font-bold text-sm">O ENTRA CON</span>
          <div className="h-0.5 bg-surface-border flex-1" />
        </div>

        <div className="flex justify-center">
          <GoogleLogin 
            onSuccess={handleGoogleSuccess} 
            onError={() => setError("Error conectando con Google")}
            theme="filled_black"
            shape="rectangular"
          />
        </div>

        <p className="text-center text-sm text-foreground/70 mt-2">
          ¿No tienes una cuenta aún?{" "}
          <Link href="/register" className="text-primary font-bold hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>

  );
}
