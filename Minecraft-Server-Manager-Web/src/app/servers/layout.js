import { DashboardNavbar } from "@/features/dashboard/components/DashboardNavbar";

export default function ServersLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardNavbar />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}
