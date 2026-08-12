"use client";

export function Sparkline({
  points,
  height = 48,
  color = "#a855f7",
}: {
  points: number[];
  height?: number;
  color?: string;
}) {
  if (!points.length) return <div style={{ height }} className="flex items-center justify-center text-xs text-muted">No data yet</div>;
  const width = 100;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const step = width / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => `${(i * step).toFixed(1)},${(height - 4 - ((p - min) / range) * (height - 8)).toFixed(1)}`);
  const area = `0,${height} ${coords.join(" ")} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function BarChart({
  data,
  height = 140,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}) {
  if (!data.length) return <div style={{ height }} className="flex items-center justify-center text-xs text-muted">No data yet</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="group flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-medium text-muted opacity-0 transition group-hover:opacity-100">
            {d.value}
          </span>
          <div
            className="w-full rounded-t-lg transition-all duration-500"
            style={{
              height: `${Math.max(4, (d.value / max) * (height - 30))}px`,
              background: d.color || "linear-gradient(180deg, #a855f7, #ff2d78)",
            }}
          />
          <span className="truncate text-[10px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
