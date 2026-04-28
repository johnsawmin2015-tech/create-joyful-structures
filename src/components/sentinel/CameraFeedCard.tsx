import { useEffect, useMemo, useRef, useState } from "react";
import { WifiOff, AlertTriangle, Activity, Maximize2 } from "lucide-react";
import { Camera, CameraStatus, AIStatus } from "@/lib/sentinel-mock";
import { RiskScoreIndicator } from "./RiskScoreIndicator";

interface BBox {
  x: number; y: number; w: number; h: number;
  label: string; confidence: number; color: string;
}

const OBJECT_COLORS: Record<string, string> = {
  person: "#00D4FF",
  vehicle: "#FF6B00",
  bag: "#A855F7",
  weapon: "#EF4444",
};

const STATUS_BADGE: Record<CameraStatus, { label: string; cls: string; dot: string }> = {
  live: { label: "LIVE", cls: "text-sentinel-green border-sentinel-green/40 bg-sentinel-green/10", dot: "bg-sentinel-green animate-pulse" },
  degraded: { label: "DEGRADED", cls: "text-sentinel-amber border-sentinel-amber/40 bg-sentinel-amber/10", dot: "bg-sentinel-amber animate-flicker" },
  offline: { label: "OFFLINE", cls: "text-muted-foreground border-border bg-muted/30", dot: "bg-muted-foreground" },
};

const AI_BADGE: Record<AIStatus, string> = {
  active: "AI",
  fallback_motion: "MOTION",
  raw_only: "RAW",
  error: "AI ERR",
};

interface CameraFeedCardProps {
  camera: Camera;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onExpand?: (id: string) => void;
  /** Last-seen timestamp for offline cameras */
  lastSeenIso?: string | null;
}

/**
 * CameraFeedCard
 * Live feed + AI bounding-box overlay + status badge (live / degraded / offline)
 * Falls back to motion-only mode under degraded AI; renders last-seen + reconnect indicator when offline.
 */
export function CameraFeedCard({ camera, selected, onSelect, onExpand, lastSeenIso }: CameraFeedCardProps) {
  const [boxes, setBoxes] = useState<BBox[]>([]);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const animRef = useRef<number>();

  const isLive = camera.status === "live";
  const isDegraded = camera.status === "degraded";
  const isOffline = camera.status === "offline";

  // Simulated AI inference loop (live only). In prod, frames flow via WebRTC and
  // bounding boxes arrive over the per-camera WebSocket subscription.
  useEffect(() => {
    if (!isLive) {
      setBoxes([]);
      return;
    }
    const tick = () => {
      const n = Math.floor(Math.random() * 3) + 1;
      const objs = ["person", "person", "vehicle", "bag"];
      setBoxes(
        Array.from({ length: n }, () => {
          const obj = objs[Math.floor(Math.random() * objs.length)];
          return {
            x: 8 + Math.random() * 60,
            y: 12 + Math.random() * 50,
            w: obj === "vehicle" ? 22 + Math.random() * 14 : 9 + Math.random() * 9,
            h: obj === "vehicle" ? 14 + Math.random() * 8 : 20 + Math.random() * 12,
            label: obj,
            confidence: 0.62 + Math.random() * 0.36,
            color: OBJECT_COLORS[obj] ?? "#00D4FF",
          };
        })
      );
      animRef.current = window.setTimeout(tick, 1800 + Math.random() * 800) as unknown as number;
    };
    tick();
    return () => { if (animRef.current) clearTimeout(animRef.current); };
  }, [isLive]);

  // Reconnect indicator for offline cameras
  useEffect(() => {
    if (!isOffline) return;
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

  const status = STATUS_BADGE[camera.status];

  return (
    <div
      onClick={() => onSelect?.(camera.cameraId)}
      className={`relative aspect-video rounded-lg border overflow-hidden group cursor-pointer transition-all bg-background ${
        selected ? "border-primary glow-cyan" : "border-border hover:border-primary/40"
      }`}
    >
      {/* Feed background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background">
        {isLive && (
          <>
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-full h-px bg-primary/20 animate-scan-line" />
            </div>
            <svg className="absolute inset-0 w-full h-full opacity-[0.07]">
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={`${(i + 1) * 16.6}%`} x2="100%" y2={`${(i + 1) * 16.6}%`} stroke="hsl(var(--primary))" strokeWidth="0.5" />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={`v${i}`} x1={`${(i + 1) * 16.6}%`} y1="0" x2={`${(i + 1) * 16.6}%`} y2="100%" stroke="hsl(var(--primary))" strokeWidth="0.5" />
              ))}
            </svg>

            {/* AI bounding boxes */}
            {boxes.map((box, i) => (
              <div
                key={i}
                className="absolute border-2 transition-all duration-700 ease-out"
                style={{
                  left: `${box.x}%`, top: `${box.y}%`,
                  width: `${box.w}%`, height: `${box.h}%`,
                  borderColor: box.color,
                  boxShadow: `0 0 10px ${box.color}50`,
                }}
              >
                <span
                  className="absolute -top-4 left-0 text-[8px] font-mono px-1 rounded leading-tight"
                  style={{ backgroundColor: box.color, color: "#050A0F" }}
                >
                  {box.label} {(box.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </>
        )}

        {isDegraded && (
          <div className="absolute inset-0 flex items-center justify-center bg-sentinel-amber/5">
            <div className="text-center">
              <AlertTriangle className="h-7 w-7 text-sentinel-amber mx-auto mb-1.5 animate-flicker" />
              <p className="text-[10px] font-mono text-sentinel-amber uppercase tracking-wider">Degraded — {AI_BADGE[camera.aiStatus]} fallback</p>
            </div>
          </div>
        )}

        {isOffline && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <WifiOff className="h-7 w-7 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-[10px] font-mono text-muted-foreground">Last seen {lastSeen}</p>
              <p className="text-[9px] font-mono text-sentinel-amber mt-1">
                <Activity className="inline h-2.5 w-2.5 mr-0.5 animate-pulse" />
                Reconnect attempt #{reconnectAttempt + 1}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Top HUD */}
      <div className="absolute top-1.5 left-2 right-2 flex items-start justify-between pointer-events-none z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`h-2 w-2 rounded-full ${status.dot}`} />
          <span className="text-[10px] font-mono text-foreground/90 truncate">{camera.label}</span>
          <span className={`text-[8px] font-mono px-1 rounded border ${status.cls}`}>{status.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] font-mono px-1 rounded bg-background/70 border border-border text-primary">
            {AI_BADGE[camera.aiStatus]}
          </span>
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-1.5 left-2 right-2 flex items-end justify-between gap-2 z-10 pointer-events-none">
        <div className="min-w-0">
          <p className="text-[9px] font-mono text-muted-foreground truncate">{camera.location}</p>
          <p className="text-[8px] font-mono text-muted-foreground/70 truncate">{camera.cameraId}</p>
        </div>
        <RiskScoreIndicator score={camera.riskScore} compact />
      </div>

      {/* Expand control */}
      {onExpand && (
        <button
          onClick={(e) => { e.stopPropagation(); onExpand(camera.cameraId); }}
          aria-label="Expand camera"
          className="absolute top-1.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 h-5 w-5 rounded bg-background/70 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-primary/20"
        >
          <Maximize2 className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}
