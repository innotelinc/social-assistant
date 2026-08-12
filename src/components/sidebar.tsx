"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./site-navbar";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/composer", label: "Composer", icon: "✍️" },
  { href: "/dashboard/queue", label: "Publish Queue", icon: "📅" },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: "🚀" },
  { href: "/dashboard/channels", label: "Channels", icon: "📣" },
  { href: "/dashboard/profile", label: "Profile Hub", icon: "👤" },
  { href: "/dashboard/billing", label: "Billing", icon: "💳" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setOpen((v) => !v);
    document.addEventListener("toggle-sidebar", handler);
    return () => document.removeEventListener("toggle-sidebar", handler);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-base font-bold tracking-tight">
              Social<span className="gradient-text">AI</span>
            </span>
          </Link>
          <button className="text-muted lg:hidden" onClick={() => setOpen(false)}>✕</button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-[#ff2d78]/15 to-[#a855f7]/15 text-foreground"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#a855f7]" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff2d78] to-[#a855f7] text-xs font-bold text-white">
              {(name || "S").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
          </div>
          <button onClick={logout} className="btn btn-ghost btn-sm mt-3 w-full">
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
