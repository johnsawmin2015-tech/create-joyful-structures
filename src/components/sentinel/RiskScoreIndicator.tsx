interface RiskScoreIndicatorProps {
  /** 0-100 derived from: motion velocity + zone classification + time-of-day + historical baseline */
  score: number;
  compact?: boolean;
  trend?: "up" | "down" | "stable";
}

/**
 * RiskScoreIndicator
 * Per-camera score (0-100). Color-coded thresholds:
 *   0-39 green (nominal), 40-69 amber (elevated), 70-100 red (critical).
 * Compact variant renders inline in CameraFeedCard; full variant for sidebars / detail panels.
 */
export function RiskScoreIndicator({ score, compact = false, trend }: RiskScoreIndicatorProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const tier = clamped >= 70 ? "critical" : clamped >= 40 ? "elevated" : "nominal";
  const colorVar =
    tier === "critical" ? "hsl(var(--sentinel-red))" :
    tier === "elevated" ? "hsl(var(--sentinel-amber))" :
    "hsl(var(--sentinel-green))";
  const label = tier === "critical" ? "HIGH" : tier === "elevated" ? "MED" : "LOW";

  if (compact) {
    return (
      <div
        className="flex items-center gap-1 px-1.5 py-0.5 rounded border bg-background/70 backdrop-blur-sm font-mono text-[9px]"
        style={{ borderColor: `${colorVar}40`, color: colorVar }}
        aria-label={`Risk score ${clamped} of 100`}
      >
        <span className="font-bold tabular-nums">{clamped}</span>
        <span className="opacity-60">/100</span>
      </div>
    );
  }

  // Full radial variant
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
          <circle
            cx="32" cy="32" r={r} fill="none"
            stroke={colorVar} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 4px ${colorVar})`, transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold font-mono tabular-nums" style={{ color: colorVar }}>{clamped}</span>
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Risk</span>
        <span className="text-xs font-bold font-mono" style={{ color: colorVar }}>{label}</span>
        {trend && (
          <span className="text-[9px] font-mono text-muted-foreground">
            {trend === "up" ? "▲ rising" : trend === "down" ? "▼ falling" : "● stable"}
          </span>
        )}
      </div>
    </div>
  );
}
