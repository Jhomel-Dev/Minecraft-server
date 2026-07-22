import { Button } from "@/shared/ui/Button";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { Pickaxe, Server, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function LandingPage() {
  const t = useTranslations("Landing");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {}
      <div className="absolute top-0 w-full h-full -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface to-background opacity-80" />

      {}
      <header className="absolute top-0 w-full p-6 flex justify-between items-center max-w-7xl">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
          <Pickaxe className="w-6 h-6" />
          <span>CraftControl</span>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/login">
            <Button variant="outline">{t('signIn')}</Button>
          </Link>
          <Link href="/register">
            <Button variant="primary">{t('getStarted')}</Button>
          </Link>
        </div>
      </header>

      {}
      <div className="text-center max-w-3xl flex flex-col gap-6 items-center z-10 mt-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-border text-sm font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          {t('versionLive')}
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-balance">
          {t('titleMain')} <span className="text-primary">{t('titleHighlight')}</span>
        </h1>
        
        <p className="text-lg md:text-xl text-foreground/80 text-balance max-w-2xl">
          {t('subtitle')}
        </p>

        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          <Link href="/register">
            <Button variant="primary" className="h-12 px-8 text-lg">
              {t('startAdventure')}
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" className="h-12 px-8 text-lg">
              {t('openDashboard')}
            </Button>
          </Link>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-24 z-10">
        <FeatureCard 
          icon={<Server className="w-8 h-8 text-primary" />}
          title={t('feature1Title')}
          description={t('feature1Desc')}
        />
        <FeatureCard 
          icon={<Settings className="w-8 h-8 text-secondary" />}
          title={t('feature2Title')}
          description={t('feature2Desc')}
        />
        <FeatureCard 
          icon={<Shield className="w-8 h-8 text-danger" />}
          title={t('feature3Title')}
          description={t('feature3Desc')}
        />
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky flex flex-col gap-4 hover:-translate-y-1 hover:shadow-lg transition-transform duration-300">
      <div className="p-3 bg-background rounded-blocky w-fit border-2 border-surface-border">
        {icon}
      </div>
      <h3 className="font-bold text-xl">{title}</h3>
      <p className="text-foreground/70">{description}</p>
    </div>
  );
}
