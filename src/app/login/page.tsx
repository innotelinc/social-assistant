import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/site-navbar";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-[#a855f7]/10 to-transparent" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <Logo />
          <span className="text-xl font-bold tracking-tight">
            Social<span className="gradient-text">AI</span>
          </span>
        </Link>
        <AuthForm mode="login" />
        <p className="mt-6 text-center text-xs text-muted/60">
          <Link href="/" className="hover:text-muted">← Back to home</Link>
        </p>
      </div>
    </main>
  );
}
