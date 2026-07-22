"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import Link from "next/link";
import { useAuthStore } from "../store/authStore";
import { loginWithCredentials, loginWithGoogle } from "../services/api";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { Pickaxe } from "lucide-react";

export function LoginForm() {
  const t = useTranslations("LoginForm");
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
      if(data.token) {
        window.location.href = "/servers";
      }
      router.push("/servers");
    } catch (err) {
      setError(t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError("");
      setLoading(true);
      try {
        const data = await loginWithGoogle(tokenResponse.access_token, true);
        setUser(data.user);
        if(data.token) {
          window.location.href = "/servers";
          return;
        }
        router.push("/servers");
      } catch (err) {
        setError(t("googleAuthError"));
        setLoading(false);
      }
    },
    onError: () => setError(t("googleConnectError"))
  });

  return (

      <div className="bg-surface border-2 border-surface-border p-8 rounded-blocky shadow-xl max-w-md w-full flex flex-col gap-6 z-10">
        
        <div className="flex flex-col items-center text-center gap-2">
          <div className="p-3 bg-background rounded-blocky border-2 border-surface-border mb-2">
            <Pickaxe className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-black text-foreground">{t("welcomeBack")}</h1>
          <p className="text-foreground/70 text-sm">{t("subtitle")}</p>
        </div>

        {error && (
          <div className="bg-danger/10 border-2 border-danger text-danger p-3 rounded-blocky text-sm font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input 
            data-cy="login-email-input"
            type="email" 
            placeholder={t("emailPlaceholder")} 
            value={email} onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <Input 
            data-cy="login-password-input"
            type="password" 
            placeholder={t("passwordPlaceholder")} 
            value={password} onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <Button data-cy="login-submit-button" type="submit" variant="primary" className="mt-2 h-12 text-lg" disabled={loading}>
            {loading ? t("loggingIn") : t("loginButton")}
          </Button>
        </form>

        <div className="flex items-center gap-4">
          <div className="h-0.5 bg-surface-border flex-1" />
          <span className="text-surface-border font-bold text-sm">{t("orLoginWith")}</span>
          <div className="h-0.5 bg-surface-border flex-1" />
        </div>

        <div className="flex justify-center">
          <Button 
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 h-12 bg-surface hover:bg-surface-hover border-2 border-surface-border text-foreground font-bold"
            onClick={() => handleCustomGoogleLogin()}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              <path d="M1 1h22v22H1z" fill="none"/>
            </svg>
            {loading ? t("authenticating") : t("googleLoginButton")}
          </Button>
        </div>

        <p className="text-center text-sm text-foreground/70 mt-2">
          {t("noAccountText")}{" "}
          <Link href="/register" className="text-primary font-bold hover:underline">
            {t("registerLink")}
          </Link>
        </p>
      </div>

  );
}
