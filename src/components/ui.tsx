"use client";

import React from "react";

export function Button({
  children,
  variant = "primary",
  size,
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "lg";
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${size ? `btn-${size}` : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return <div className={`card ${glow ? "glow-card" : ""} ${className}`}>{children}</div>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`input ${className}`} {...rest} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea className={`input min-h-24 ${className}`} {...rest} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select className={`input ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "brand" | "accent";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-[#23233a] text-muted",
    success: "bg-[#34d399]/10 text-[#34d399]",
    warning: "bg-[#fbbf24]/10 text-[#fbbf24]",
    danger: "bg-[#f87171]/10 text-[#f87171]",
    brand: "bg-[#ff2d78]/10 text-[#ff2d78]",
    accent: "bg-[#a855f7]/10 text-[#a855f7]",
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function EmptyState({
  icon = "✨",
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#a855f7]/10 text-2xl">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

export function Toast({ message, tone = "success", onClose }: { message: string; tone?: "success" | "danger" | "info"; onClose?: () => void }) {
  const colors = {
    success: "border-[#34d399]/40 bg-[#0f2a22] text-[#34d399]",
    danger: "border-[#f87171]/40 bg-[#2a1015] text-[#f87171]",
    info: "border-[#a855f7]/40 bg-[#1c1133] text-[#c4b5fd]",
  };
  return (
    <div className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl ${colors[tone]}`}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100">✕</button>
      )}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = React.useState<{ id: number; message: string; tone: "success" | "danger" | "info" }[]>([]);
  const push = React.useCallback((message: string, tone: "success" | "danger" | "info" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const node = (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} tone={t.tone} onClose={() => setToasts((x) => x.filter((y) => y.id !== t.id))} />
      ))}
    </div>
  );
  return { push, node };
}
