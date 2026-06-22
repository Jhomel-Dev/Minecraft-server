import { CreateServerWizard } from "@/features/servers/components/CreateServerWizard";

export default function NewServerPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <CreateServerWizard />
    </main>
  );
}
