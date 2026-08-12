import Link from "next/link";
import { Logo } from "./site-navbar";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="text-lg font-bold tracking-tight">
                Social<span className="gradient-text">AI</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Your AI social assistant. Write once, publish everywhere — on-brand content for every
              platform, on autopilot, every single day.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Product</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              <li><Link href="/#features" className="transition hover:text-foreground">Features</Link></li>
              <li><Link href="/pricing" className="transition hover:text-foreground">Pricing</Link></li>
              <li><Link href="/signup" className="transition hover:text-foreground">Get started</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Company</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              <li>
                <a href="https://github.com/innotelinc/social-assistant" target="_blank" rel="noreferrer" className="transition hover:text-foreground">
                  GitHub
                </a>
              </li>
              <li><span className="text-muted/70">socialai.innotel.us</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted/70 sm:flex-row">
          <p>© {new Date().getFullYear()} innotelinc · Built with 💜 for creators who want their time back.</p>
          <p>Open source · MIT License</p>
        </div>
      </div>
    </footer>
  );
}
