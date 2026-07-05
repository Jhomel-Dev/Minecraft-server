import { LoginForm } from "@/features/auth/components/LoginForm";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import Link from "next/link";
import { Pickaxe } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-surface-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-surface-border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 -z-10" />

      {}
      <header className="absolute top-0 w-full p-6 flex justify-between items-center max-w-7xl">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:brightness-110 transition-all">
          <Pickaxe className="w-6 h-6" />
          <span>CraftControl</span>
        </Link>
        <ThemeToggle />
      </header>

      <LoginForm />
    </main>
  );
}
