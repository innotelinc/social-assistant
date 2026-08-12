import Link from "next/link";

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl font-bold text-white"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #ff2d78, #a855f7)",
        fontSize: size * 0.45,
      }}
    >
      ✦
    </span>
  );
}

export function SiteNavbar({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="text-lg font-bold tracking-tight">
            Social<span className="gradient-text">AI</span>
          </span>
        </Link>
        <div className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
          <Link href="/#features" className="transition hover:text-foreground">Features</Link>
          <Link href="/#how-it-works" className="transition hover:text-foreground">How it works</Link>
          <Link href="/#ai" className="transition hover:text-foreground">AI Assistant</Link>
          <Link href="/pricing" className="transition hover:text-foreground">Pricing</Link>
        </div>
        <div className="flex items-center gap-3">
          {loggedIn ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">Open Dashboard →</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">Get Started Free</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
