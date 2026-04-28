import { useEffect, useState } from "react";
import { Check, ChevronRight, Camera as CameraIcon } from "lucide-react";
import { Alert, Severity } from "@/lib/sentinel-mock";

const SEVERITY_STYLE: Record<Severity, { ring: string; chip: string; dot: string; glow: string }> = {
  critical: { ring: "border-sentinel-red/60", chip: "bg-sentinel-red text-destructive-foreground", dot: "bg-sentinel-red", glow: "glow-red" },
  high:     { ring: "border-sentinel-amber/50", chip: "bg-sentinel-amber text-primary-foreground", dot: "bg-sentinel-amber", glow: "glow-amber" },
  medium:   { ring: "border-primary/40", chip: "bg-primary text-primary-foreground", dot: "bg-primary", glow: "" },
  low:      { ring: "border-border", chip: "bg-secondary text-secondary-foreground", dot: "bg-sentinel-green", glow: "" },
};

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  onSelect?: (alert: Alert) => void;
  cameraLabel?: string;
}

function useRelative(timestamp: string) {
  const [text, setText] = useState(() => format(timestamp));
  useEffect(() => {
    const i = setInterval(() => setText(format(timestamp)), 1000);
    return () => clearInterval(i);
  }, [timestamp]);
  return text;
}

function format(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

/**
 * AlertCard
 * Severity-coded (critical/high/medium/low) + timestamp + camera ref + dismiss action.
 * Critical alerts pulse to attract analyst attention without obstructing other UI.
 */
export function AlertCard({ alert, onAcknowledge, onSelect, cameraLabel }: AlertCardProps) {
  const style = SEVERITY_STYLE[alert.severity];
  const relative = useRelative(alert.timestamp);
  const isCritical = alert.severity === "critical" && !alert.acknowledged;

  return (
    <div
      onClick={() => onSelect?.(alert)}
      className={`group relative bg-card border rounded-md p-2.5 cursor-pointer transition-all hover:bg-card/80 ${
        alert.acknowledged ? "opacity-50 border-border" : `${style.ring} ${isCritical ? `${style.glow} animate-pulse-glow` : ""}`
      }`}
    >
      {/* Severity stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${style.dot}`} />

      <div className="pl-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${style.chip}`}>
              {alert.severity}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground truncate">
              {alert.eventType.replace(/_/g, " ")}
            </span>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground shrink-0">{relative}</span>
        </div>

        <p className="text-xs leading-snug text-foreground line-clamp-2 mb-1.5">
          {alert.message ?? alert.eventType}
        </p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground min-w-0">
            <CameraIcon className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{cameraLabel ?? alert.cameraId}</span>
            <span className="text-primary/70 shrink-0">· {(alert.confidence * 100).toFixed(0)}%</span>
          </div>

          {!alert.acknowledged ? (
            <button
              onClick={(e) => { e.stopPropagation(); onAcknowledge?.(alert.alertId); }}
              className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border border-border hover:border-primary hover:text-primary transition-colors shrink-0"
              aria-label={`Acknowledge alert ${alert.alertId}`}
            >
              <Check className="h-2.5 w-2.5" />
              ACK
            </button>
          ) : (
            <span className="text-[9px] font-mono text-muted-foreground shrink-0">
              <Check className="inline h-2.5 w-2.5" /> ack
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
