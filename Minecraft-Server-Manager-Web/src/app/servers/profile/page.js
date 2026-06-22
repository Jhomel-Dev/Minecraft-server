import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { GlobalBackupsSummary } from "@/features/profile/components/GlobalBackupsSummary";

export default function ProfilePage() {
  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6 animate-in fade-in h-full">
      <div className="mb-4">
        <h1 className="text-3xl font-black">Mi Perfil</h1>
        <p className="text-foreground/70">Administra tu cuenta global y seguridad.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProfileForm />
        <GlobalBackupsSummary />
      </div>
    </div>
  );
}
