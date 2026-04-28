import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface RiskScoreIndicatorProps {
  /** 0-100 — derived from motion velocity + zone classification + time-of-day + historical baseline */
  score: number;
  /** Compact = inline HUD chip; full = radial dial with label/trend */
  compact?: boolean;
  trend?: "up" | "down" | "stable";
  /** Override label (e.g. "Composite Risk") */
  label?: string;
  /** Show secondary subtitle in full mode */
  subtitle?: string;
}

function tierFor(score: number) {
  const clamped = Math.max(0, Math.min(100, score));
  const tier =
    clamped >= 70 ? ("critical" as const) :
    clamped >= 40 ? ("elevated" as const) : ("nominal" as const);
  const colorVar =
    tier === "critical" ? "hsl(var(--sentinel-red))" :
    tier === "elevated" ? "hsl(var(--sentinel-amber))" :
    "hsl(var(--sentinel-green))";
  const labelText = tier === "critical" ? "HIGH" : tier === "elevated" ? "MED" : "LOW";
  return { clamped, tier, colorVar, labelText };
}

/**
 * RiskScoreIndicator — Premium risk dial.
 * Compact: inline chip for HUD overlays.
 * Full: radial 0-100 dial with trend chevron and tier label.
 */
export function RiskScoreIndicator({ score, compact = false, trend, label = "Risk", subtitle }: RiskScoreIndicatorProps) {
  const { clamped, colorVar, labelText } = tierFor(score);

  if (compact) {
    return (
      <div
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm border bg-background/75 backdrop-blur-sm font-mono text-[9px] data-num"
        style={{ borderColor: `${colorVar}40`, color: colorVar }}
        aria-label={`Risk score ${clamped} of 100`}
      >
        <span className="font-semibold">{clamped}</span>
        <span className="opacity-60 font-normal">/100</span>
      </div>
    );
  }

  // Full radial — slightly larger arc with track + animated stroke
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  const trendText = trend === "up" ? "rising" : trend === "down" ? "falling" : "stable";
  const trendCls = trend === "up" ? "text-sentinel-red" : trend === "down" ? "text-sentinel-green" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-3" role="img" aria-label={`Risk score ${clamped} of 100, tier ${labelText}`}>
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90" aria-hidden>
          <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
          <circle
            cx="36" cy="36" r={r} fill="none"
            stroke={colorVar} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 6px ${colorVar})`, transition: "stroke-dashoffset 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-light data-num leading-none" style={{ color: colorVar }}>{clamped}</span>
          <span className="text-[8px] font-mono text-muted-foreground tracking-[0.12em] uppercase mt-0.5">/100</span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="eyebrow">{label}</span>
        <span className="text-sm font-mono font-medium tracking-wider uppercase" style={{ color: colorVar }}>{labelText}</span>
        {trend && (
          <span className={`text-[10px] font-mono inline-flex items-center gap-1 ${trendCls}`}>
            <TrendIcon className="h-2.5 w-2.5" aria-hidden />
            {trendText}
          </span>
        )}
        {subtitle && <span className="text-[10px] font-mono text-muted-foreground">{subtitle}</span>}
      </div>
    </div>
  );
}
