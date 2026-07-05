import { Button } from "@/shared/ui/Button";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { Pickaxe, Server, Settings, Shield } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
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
          <ThemeToggle />
          <Link href="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button variant="primary">Get Started</Button>
          </Link>
        </div>
      </header>

      {}
      <div className="text-center max-w-3xl flex flex-col gap-6 items-center z-10 mt-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-border text-sm font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          V2.0 is now live with Zero-Copy Linux Architecture
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-balance">
          Manage your Minecraft Servers <span className="text-primary">like a Pro.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-foreground/80 text-balance max-w-2xl">
          Deploy, monitor, and configure your Paper, Fabric or Vanilla servers in seconds. All wrapped in a gorgeous blocky interface.
        </p>

        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          <Link href="/register">
            <Button variant="primary" className="h-12 px-8 text-lg">
              Start your Adventure
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" className="h-12 px-8 text-lg">
              Open Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-24 z-10">
        <FeatureCard 
          icon={<Server className="w-8 h-8 text-primary" />}
          title="Zero-Copy Deployments"
          description="Save gigabytes of storage by sharing a single JAR across all your network servers instantly."
        />
        <FeatureCard 
          icon={<Settings className="w-8 h-8 text-secondary" />}
          title="Live Console & File Manager"
          description="Interact with your server console in real-time and edit configuration files directly from your browser."
        />
        <FeatureCard 
          icon={<Shield className="w-8 h-8 text-danger" />}
          title="Secure by Design"
          description="Integrated Google OAuth, JWT sessions, and strict path traversal prevention out of the box."
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
