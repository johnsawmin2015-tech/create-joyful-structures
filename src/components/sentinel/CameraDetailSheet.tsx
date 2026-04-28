import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { RiskScoreIndicator } from "./RiskScoreIndicator";
import type { Alert, Camera, TimelineEvent } from "@/lib/sentinel-mock";
import { Activity, MapPin, Radio, Signal, Wifi } from "lucide-react";

interface CameraDetailSheetProps {
  camera: Camera | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recentAlerts: Alert[];
  recentEvents: TimelineEvent[];
}

const STATUS_COLOR: Record<string, string> = {
  live:     "text-sentinel-green",
  degraded: "text-sentinel-amber",
  offline:  "text-muted-foreground",
};

/**
 * CameraDetailSheet — Slide-in luxury detail panel for a selected camera.
 * Shows enlarged feed, full risk dial, recent alerts, and per-camera event history.
 */
export function CameraDetailSheet({ camera, open, onOpenChange, recentAlerts, recentEvents }: CameraDetailSheetProps) {
  const trend = useMemo<"up" | "down" | "stable">(() => {
    if (!camera) return "stable";
    if (camera.riskScore > 70) return "up";
    if (camera.riskScore < 30) return "down";
    return "stable";
  }, [camera]);

  if (!camera) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-background border-l border-border p-0 flex flex-col gap-0 overflow-hidden"
      >
        {/* ─── Header ───────────────────────────────────────────── */}
        <SheetHeader className="p-5 border-b border-border space-y-2 text-left">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Camera Detail</span>
            <span className="text-[10px] font-mono text-muted-foreground/60">·</span>
            <span className={`text-[10px] font-mono uppercase tracking-[0.18em] ${STATUS_COLOR[camera.status]}`}>
              {camera.status}
            </span>
          </div>
          <SheetTitle className="display-h1 text-3xl text-foreground">{camera.label}</SheetTitle>
          <SheetDescription className="text-xs font-mono text-muted-foreground inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3" aria-hidden />
            {camera.location}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* ─── Enlarged feed surface ────────────────────────── */}
          <div className="relative aspect-video rounded-md border border-border overflow-hidden bg-[radial-gradient(ellipse_at_center,hsl(var(--card))_0%,hsl(var(--background))_100%)]">
            {camera.status === "live" ? (
              <>
                <svg className="absolute inset-0 w-full h-full opacity-[0.06]" aria-hidden>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <line key={`h${i}`} x1="0" y1={`${(i + 1) * 12.5}%`} x2="100%" y2={`${(i + 1) * 12.5}%`} stroke="currentColor" strokeWidth="0.5" />
                  ))}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <line key={`v${i}`} x1={`${(i + 1) * 12.5}%`} y1="0" x2={`${(i + 1) * 12.5}%`} y2="100%" stroke="currentColor" strokeWidth="0.5" />
                  ))}
                </svg>
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute w-full h-px bg-primary/20 animate-scan-line" />
                </div>
                <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-background/70 backdrop-blur-sm border border-border rounded-sm px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sentinel-red animate-rec" aria-hidden />
                  <span className="text-hud-xs font-mono text-foreground">REC · {camera.cameraId}</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm font-mono text-muted-foreground uppercase tracking-[0.2em]">{camera.status}</p>
              </div>
            )}
            {/* Corner brackets */}
            <span className="absolute top-2 left-2 h-3 w-3 border-t border-l border-foreground/30" aria-hidden />
            <span className="absolute top-2 right-2 h-3 w-3 border-t border-r border-foreground/30" aria-hidden />
            <span className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-foreground/30" aria-hidden />
            <span className="absolute bottom-2 right-2 h-3 w-3 border-b border-r border-foreground/30" aria-hidden />
          </div>

          {/* ─── Risk + telemetry ─────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 surface-1 rounded-md p-4">
            <RiskScoreIndicator
              score={camera.riskScore}
              label="Composite Risk"
              trend={trend}
              subtitle="60s window"
            />
            <div className="grid grid-cols-2 gap-3 content-center">
              <Stat icon={Signal} label="AI Pipeline" value={camera.aiStatus.replace(/_/g, " ")} />
              <Stat icon={Radio}  label="Stream URL"  value={camera.streamUrl.replace("rtsp://", "")} mono small />
              <Stat icon={Wifi}   label="Status"      value={camera.status} />
              <Stat icon={Activity} label="Last Alert" value={camera.lastAlert ? new Date(camera.lastAlert).toLocaleTimeString() : "—"} />
            </div>
          </div>

          {/* ─── Recent alerts ────────────────────────────────── */}
          <section>
            <header className="flex items-center justify-between mb-2">
              <h3 className="eyebrow">Recent Alerts</h3>
              <span className="text-[10px] font-mono text-muted-foreground">{recentAlerts.length}</span>
            </header>
            {recentAlerts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-sm font-mono">No alerts on this camera</p>
            ) : (
              <ul className="space-y-1.5">
                {recentAlerts.slice(0, 5).map((a) => (
                  <li key={a.alertId} className="flex items-center gap-2 px-2 py-1.5 surface-1 rounded-sm">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      a.severity === "critical" ? "bg-sentinel-red" :
                      a.severity === "high"     ? "bg-sentinel-amber" :
                      a.severity === "medium"   ? "bg-primary" : "bg-muted-foreground/40"
                    }`} aria-hidden />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{a.severity}</span>
                    <span className="text-xs flex-1 truncate">{a.message ?? a.eventType.replace(/_/g, " ")}</span>
                    <span className="text-[10px] font-mono text-muted-foreground data-num">
                      {(a.confidence * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ─── Event history ────────────────────────────────── */}
          <section>
            <header className="flex items-center justify-between mb-2">
              <h3 className="eyebrow">Event History</h3>
              <span className="text-[10px] font-mono text-muted-foreground">{recentEvents.length}</span>
            </header>
            <ul className="space-y-px">
              {recentEvents.slice(0, 12).map((e) => (
                <li key={e.eventId} className="grid grid-cols-[80px_1fr_44px] items-center gap-2 py-1 px-2 hover:bg-muted/20 rounded-sm">
                  <span className="text-[10px] font-mono text-muted-foreground data-num">
                    {new Date(e.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                  </span>
                  <span className="text-[11px] font-mono text-foreground truncate uppercase tracking-wider">
                    {e.eventType.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-mono data-num text-muted-foreground text-right">
                    {(e.confidence * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({
  icon: Icon, label, value, mono, small,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden />
        <span className="eyebrow">{label}</span>
      </div>
      <p className={`${mono ? "font-mono" : ""} ${small ? "text-[10px]" : "text-xs"} text-foreground truncate uppercase tracking-wider`}>
        {value}
      </p>
    </div>
  );
}
