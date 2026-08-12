import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SocialAI — Your AI Social Assistant",
    template: "%s · SocialAI",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  description:
    "SocialAI is the easiest way to run your social media: an AI assistant that learns your voice, writes on-brand content for every platform, schedules it, and publishes everywhere — all from one dashboard.",
  keywords: [
    "social media", "AI assistant", "content scheduler", "auto publish", "multi-platform posting",
    "LinkedIn", "X", "Instagram", "Facebook", "Threads", "TikTok", "content automation",
  ],
  openGraph: {
    title: "SocialAI — Your AI Social Assistant",
    description: "Write once, publish everywhere. Your AI social department that works every day.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
