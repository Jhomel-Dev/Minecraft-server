"use client";
import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import Link from "next/link";
import { useAuthStore } from "../store/authStore";
import { registerWithCredentials } from "../services/api";
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
      if (data.accessToken) localStorage.setItem("accessToken", data.accessToken);
      
      router.push("/dashboard/new-server");
    } catch (err) {
      setError("No se pudo crear la cuenta. Inténtalo con otro correo o usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border-2 border-surface-border p-8 rounded-blocky shadow-xl max-w-md w-full flex flex-col gap-6 z-10">
      
      <div className="flex flex-col items-center text-center gap-2">
        <div className="p-3 bg-background rounded-blocky border-2 border-surface-border mb-2">
          <Pickaxe className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-black text-foreground">Crear Cuenta</h1>
        <p className="text-foreground/70 text-sm">Únete a CraftControl para administrar tus servidores</p>
      </div>

      {error && (
        <div className="bg-danger/10 border-2 border-danger text-danger p-3 rounded-blocky text-sm font-semibold text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <Input 
          type="text" 
          placeholder="Nombre de usuario (Ej. Notch)" 
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
          {loading ? "Creando cuenta..." : "Registrarse"}
        </Button>
      </form>

      <p className="text-center text-sm text-foreground/70 mt-2">
        ¿Ya eres parte del equipo?{" "}
        <Link href="/login" className="text-primary font-bold hover:underline">
          Inicia Sesión
        </Link>
      </p>
    </div>
  );
}
