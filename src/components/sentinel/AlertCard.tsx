import { useContext, createContext, useEffect, useState, type ReactNode } from "react";
import { Check, ChevronRight, Camera as CameraIcon } from "lucide-react";
import type { Alert, Severity } from "@/lib/sentinel-mock";

/**
 * Shared 1Hz tick context — replaces N independent setInterval timers across
 * mounted AlertCards with a single source of truth. Cards re-render only when
 * the relative-time string would change.
 */
const NowContext = createContext<number>(Date.now());

export function NowTickProvider({ children, interval = 1000 }: { children: ReactNode; interval?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(i);
  }, [interval]);
  return <NowContext.Provider value={now}>{children}</NowContext.Provider>;
}

const SEVERITY_STYLE: Record<Severity, { rail: string; chip: string; text: string; ring: string; glow: string }> = {
  critical: {
    rail: "bg-sentinel-red",
    chip: "bg-sentinel-red text-severity-critical-fg",
    text: "text-sentinel-red",
    ring: "border-sentinel-red/40 hover:border-sentinel-red/60",
    glow: "animate-glow-pulse-red",
  },
  high: {
    rail: "bg-sentinel-amber",
    chip: "bg-sentinel-amber text-severity-high-fg",
    text: "text-sentinel-amber",
    ring: "border-sentinel-amber/30 hover:border-sentinel-amber/50",
    glow: "",
  },
  medium: {
    rail: "bg-primary",
    chip: "bg-primary text-severity-medium-fg",
    text: "text-primary",
    ring: "border-border hover:border-primary/40",
    glow: "",
  },
  low: {
    rail: "bg-muted-foreground/40",
    chip: "bg-secondary text-severity-low-fg",
    text: "text-muted-foreground",
    ring: "border-border hover:border-border",
    glow: "",
  },
};

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  onSelect?: (alert: Alert) => void;
  cameraLabel?: string;
}

function relativeTime(ts: string, now: number) {
  const diff = now - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${Math.max(0, s)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/**
 * AlertCard — Premium severity-coded incident card.
 * Uses NowTickProvider for relative time so N cards share 1 timer.
 */
export function AlertCard({ alert, onAcknowledge, onSelect, cameraLabel }: AlertCardProps) {
  const now = useContext(NowContext);
  const style = SEVERITY_STYLE[alert.severity];
  const rel = relativeTime(alert.timestamp, now);
  const isCriticalLive = alert.severity === "critical" && !alert.acknowledged;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(alert)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(alert); }
      }}
      aria-label={`${alert.severity} alert: ${alert.eventType.replace(/_/g, " ")} at ${cameraLabel ?? alert.cameraId}`}
      className={`group relative bg-card border rounded-md cursor-pointer outline-none
        transition-all duration-150 ease-out
        focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background
        ${alert.acknowledged
          ? "opacity-55 border-border/60 hover:opacity-80"
          : `${style.ring} ${isCriticalLive ? style.glow : "hover:bg-card/80"} hover:translate-x-0.5`}`}
    >
      {/* Severity rail */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md ${style.rail}`} aria-hidden />

      <div className="pl-3 pr-2.5 py-2.5">
        {/* Top row: severity chip · event type · time */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-sm uppercase tracking-[0.12em] ${style.chip}`}>
              {alert.severity}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground truncate uppercase tracking-wider">
              {alert.eventType.replace(/_/g, " ")}
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground shrink-0 data-num">{rel}</span>
        </div>

        {/* Message */}
        <p className="text-[12px] leading-snug text-foreground line-clamp-2 mb-2">
          {alert.message ?? alert.eventType}
        </p>

        {/* Bottom row: camera · confidence · ack */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground min-w-0">
            <CameraIcon className="h-2.5 w-2.5 shrink-0" aria-hidden />
            <span className="truncate">{cameraLabel ?? alert.cameraId}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className={`data-num ${style.text}`}>{(alert.confidence * 100).toFixed(0)}%</span>
          </div>

          {!alert.acknowledged ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAcknowledge?.(alert.alertId); }}
              className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm border border-border hover:border-primary hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
              aria-label={`Acknowledge ${alert.alertId}`}
            >
              <Check className="h-2.5 w-2.5" aria-hidden />
              Ack
            </button>
          ) : (
            <span className="text-[10px] font-mono text-muted-foreground shrink-0 inline-flex items-center gap-1">
              <Check className="h-2.5 w-2.5" aria-hidden />
              acked
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-50 transition-opacity" aria-hidden />
    </div>
  );
}
