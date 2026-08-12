import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar name={user.name} email={user.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface/60 px-6 backdrop-blur-xl lg:hidden">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => document.dispatchEvent(new CustomEvent("toggle-sidebar"))}
          >
            ☰ Menu
          </button>
        </header>
        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
