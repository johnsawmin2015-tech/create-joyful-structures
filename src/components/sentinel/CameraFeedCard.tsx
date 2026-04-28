import { useEffect, useMemo, useRef, useState } from "react";
import { WifiOff, AlertTriangle, Activity, Maximize2, Circle } from "lucide-react";
import type { Camera, CameraStatus, AIStatus } from "@/lib/sentinel-mock";
import { RiskScoreIndicator } from "./RiskScoreIndicator";

interface BBox {
  id: number;
  x: number; y: number; w: number; h: number;
  label: string; confidence: number; color: string;
}

const OBJECT_COLORS: Record<string, string> = {
  person:  "hsl(var(--sentinel-cyan))",
  vehicle: "hsl(var(--sentinel-amber))",
  bag:     "hsl(280 70% 65%)",
  weapon:  "hsl(var(--sentinel-red))",
};

const STATUS_RAIL: Record<CameraStatus, string> = {
  live:     "bg-sentinel-green",
  degraded: "bg-sentinel-amber",
  offline:  "bg-muted-foreground/40",
};

const AI_BADGE: Record<AIStatus, { text: string; cls: string }> = {
  active:           { text: "AI",      cls: "text-primary border-primary/40 bg-primary/5" },
  fallback_motion:  { text: "MOTION",  cls: "text-sentinel-amber border-sentinel-amber/40 bg-sentinel-amber/5" },
  raw_only:         { text: "RAW",     cls: "text-muted-foreground border-border bg-muted/30" },
  error:            { text: "AI ERR",  cls: "text-sentinel-red border-sentinel-red/40 bg-sentinel-red/5" },
};

interface CameraFeedCardProps {
  camera: Camera;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onExpand?: (id: string) => void;
  lastSeenIso?: string | null;
  /** Stagger animation delay for grid entrance (ms). */
  delay?: number;
}

/**
 * CameraFeedCard — Premium HUD-style live feed card.
 *
 * • live: scanline + AI bbox overlay + REC indicator
 * • degraded: motion-only fallback notice
 * • offline: last-seen + reconnect attempt counter
 *
 * Accessibility: rendered as <button>, supports keyboard activation,
 * AI overlay summarized in aria-label so screen readers see the detections.
 */
export function CameraFeedCard({ camera, selected, onSelect, onExpand, lastSeenIso, delay = 0 }: CameraFeedCardProps) {
  const [boxes, setBoxes] = useState<BBox[]>([]);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const animRef = useRef<number>();

  const isLive = camera.status === "live";
  const isDegraded = camera.status === "degraded";
  const isOffline = camera.status === "offline";

  // AI inference loop — replaces frames every 1.8-2.6s when live
  useEffect(() => {
    if (!isLive) { setBoxes([]); return; }
    let id = 0;
    const tick = () => {
      const n = Math.floor(Math.random() * 3) + 1;
      const objs = ["person", "person", "vehicle", "bag"] as const;
      setBoxes(
        Array.from({ length: n }, () => {
          const obj = objs[Math.floor(Math.random() * objs.length)];
          return {
            id: id++,
            x: 6 + Math.random() * 62,
            y: 12 + Math.random() * 48,
            w: obj === "vehicle" ? 22 + Math.random() * 16 : 9 + Math.random() * 9,
            h: obj === "vehicle" ? 14 + Math.random() * 10 : 20 + Math.random() * 14,
            label: obj,
            confidence: 0.62 + Math.random() * 0.36,
            color: OBJECT_COLORS[obj] ?? OBJECT_COLORS.person,
          };
        })
      );
      animRef.current = window.setTimeout(tick, 1800 + Math.random() * 800) as unknown as number;
    };
    tick();
    return () => { if (animRef.current) clearTimeout(animRef.current); };
  }, [isLive]);

  // Reconnect attempt counter for offline cameras
  useEffect(() => {
    if (!isOffline) { setReconnectAttempt(0); return; }
    const i = setInterval(() => setReconnectAttempt((n) => n + 1), 5000);
    return () => clearInterval(i);
  }, [isOffline]);

  const lastSeen = useMemo(() => {
    if (!lastSeenIso) return "—";
    const diff = Date.now() - new Date(lastSeenIso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
  }, [lastSeenIso]);

  // Accessibility: textual summary of AI detections
  const detectionSummary = useMemo(() => {
    if (!isLive || boxes.length === 0) return "no active detections";
    const counts = boxes.reduce<Record<string, number>>((acc, b) => {
      acc[b.label] = (acc[b.label] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([k, v]) => `${v} ${k}${v > 1 ? "s" : ""}`).join(", ");
  }, [isLive, boxes]);

  const ariaLabel = `${camera.label} ${camera.status} at ${camera.location}. Risk score ${camera.riskScore} of 100. ${detectionSummary}.`;

  const ai = AI_BADGE[camera.aiStatus];

  return (
    <button
      type="button"
      onClick={() => onSelect?.(camera.cameraId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(camera.cameraId);
        }
      }}
      aria-label={ariaLabel}
      aria-pressed={selected}
      style={{ animationDelay: `${delay}ms` }}
      className={`group relative aspect-video rounded-md border overflow-hidden text-left bg-background animate-fade-in-up
        transition-all duration-200 ease-out outline-none
        ${selected
          ? "border-primary/80 glow-cyan z-10"
          : "border-border hover:border-primary/40 hover:-translate-y-px"
        }`}
    >
      {/* ─── Feed surface ─────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--card))_0%,hsl(var(--background))_100%)]">
        {isLive && (
          <>
            {/* Subtle technical grid */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.05]" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={`${(i + 1) * 16.6}%`} x2="100%" y2={`${(i + 1) * 16.6}%`} stroke="currentColor" strokeWidth="0.5" className="text-foreground" />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={`v${i}`} x1={`${(i + 1) * 16.6}%`} y1="0" x2={`${(i + 1) * 16.6}%`} y2="100%" stroke="currentColor" strokeWidth="0.5" className="text-foreground" />
              ))}
            </svg>

            {/* Scan line — only on hover/select to reduce visual noise */}
            <div className={`absolute inset-0 overflow-hidden transition-opacity duration-300 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
              <div className="absolute w-full h-px bg-primary/30 animate-scan-line" />
            </div>

            {/* AI bounding boxes */}
            {boxes.map((box) => (
              <div
                key={box.id}
                className="absolute border transition-all duration-700 ease-out"
                style={{
                  left: `${box.x}%`, top: `${box.y}%`,
                  width: `${box.w}%`, height: `${box.h}%`,
                  borderColor: box.color,
                  boxShadow: `inset 0 0 0 1px ${box.color}30, 0 0 12px ${box.color}40`,
                }}
                aria-hidden
              >
                <span
                  className="absolute -top-[14px] left-0 text-[8px] font-mono px-1 rounded-sm leading-tight tracking-wider uppercase"
                  style={{ backgroundColor: box.color, color: "hsl(var(--background))" }}
                >
                  {box.label} · {(box.confidence * 100).toFixed(0)}
                </span>
              </div>
            ))}
          </>
        )}

        {isDegraded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="h-7 w-7 text-sentinel-amber mx-auto mb-2 animate-flicker" />
              <p className="text-hud-sm font-mono text-sentinel-amber uppercase tracking-[0.2em]">Degraded</p>
              <p className="text-hud-xs font-mono text-muted-foreground mt-1">{ai.text} fallback</p>
            </div>
          </div>
        )}

        {isOffline && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <WifiOff className="h-7 w-7 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-hud-sm font-mono text-muted-foreground uppercase tracking-[0.2em]">Signal lost</p>
              <p className="text-hud-xs font-mono text-muted-foreground/80 mt-1">last seen {lastSeen}</p>
              <p className="text-hud-xs font-mono text-sentinel-amber mt-2 inline-flex items-center gap-1">
                <Activity className="h-2.5 w-2.5 animate-pulse" />
                reconnect #{reconnectAttempt + 1}
              </p>
            </div>
          </div>
        )}

        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-background/20 pointer-events-none" aria-hidden />
      </div>

      {/* ─── Corner brackets (selected/hover) ─────────────────────── */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${
        selected ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-50 text-foreground"
      }`} aria-hidden>
        <span className="absolute top-1 left-1 h-2 w-2 border-t border-l border-current" />
        <span className="absolute top-1 right-1 h-2 w-2 border-t border-r border-current" />
        <span className="absolute bottom-1 left-1 h-2 w-2 border-b border-l border-current" />
        <span className="absolute bottom-1 right-1 h-2 w-2 border-b border-r border-current" />
      </div>

      {/* ─── Top HUD ──────────────────────────────────────────────── */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none z-10 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Status rail */}
          <span className={`h-3 w-0.5 rounded-full ${STATUS_RAIL[camera.status]}`} aria-hidden />
          {/* REC dot for live */}
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-background/70 backdrop-blur-sm border border-border px-1 py-px">
              <Circle className="h-1.5 w-1.5 fill-sentinel-red text-sentinel-red animate-rec" />
              <span className="text-hud-xs font-mono text-foreground">REC</span>
            </span>
          )}
          <span className="text-hud-sm font-mono font-medium text-foreground truncate">{camera.label}</span>
        </div>
        <span className={`text-hud-xs font-mono px-1.5 py-px rounded-sm border ${ai.cls} backdrop-blur-sm shrink-0`}>
          {ai.text}
        </span>
      </div>

      {/* ─── Bottom HUD ──────────────────────────────────────────── */}
      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 z-10 pointer-events-none">
        <div className="min-w-0 space-y-0.5">
          <p className="text-hud-xs font-mono text-foreground/85 truncate">{camera.location}</p>
          <p className="text-[8px] font-mono text-muted-foreground/70 truncate tracking-wider">{camera.cameraId}</p>
        </div>
        {!isOffline && <RiskScoreIndicator score={camera.riskScore} compact />}
      </div>

      {/* ─── Expand control ──────────────────────────────────────── */}
      {onExpand && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => { e.stopPropagation(); onExpand(camera.cameraId); }}
          aria-label={`Open ${camera.label} detail panel`}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all z-20 h-6 w-6 rounded-sm bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-primary/15 hover:border-primary/40 hover:text-primary translate-y-7 group-hover:translate-y-0"
          style={{ transitionDelay: "60ms" }}
        >
          <Maximize2 className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}
