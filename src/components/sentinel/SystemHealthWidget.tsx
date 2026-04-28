import { useEffect, useRef } from "react";
import { Activity, Cpu, Gauge, Radio, ShieldAlert } from "lucide-react";
import type { SystemHealth } from "@/lib/sentinel-mock";

interface SystemHealthWidgetProps {
  health: SystemHealth;
  /** WebSocket connection state (drives stale-data badge) */
  wsState: "connected" | "reconnecting" | "disconnected";
  /** Optional sparkline series (most recent last) */
  inferenceHistory?: number[];
  brokerHistory?: number[];
}

const SLA = {
  inferenceP95: 150, // ms
  brokerLag: 50,     // ms
} as const;

type AccentState = "ok" | "warn" | "breach";
const STATE_TEXT: Record<AccentState, string> = {
  ok:     "text-sentinel-green",
  warn:   "text-sentinel-amber",
  breach: "text-sentinel-red",
};
const STATE_BAR: Record<AccentState, string> = {
  ok:     "bg-sentinel-green/70",
  warn:   "bg-sentinel-amber/70",
  breach: "bg-sentinel-red/70",
};

/**
 * SystemHealthWidget — premium telemetry rail.
 * Five SLA-coded panels with sparkline trails, plus a real-time link badge.
 */
export function SystemHealthWidget({ health, wsState, inferenceHistory, brokerHistory }: SystemHealthWidgetProps) {
  const streamPct = health.totalStreams > 0 ? (health.activeStreams / health.totalStreams) * 100 : 0;
  const streamState: AccentState = streamPct < 90 ? "breach" : streamPct < 95 ? "warn" : "ok";
  const inferenceState: AccentState =
    health.inferenceLatencyP95ms > SLA.inferenceP95 ? "breach" :
    health.inferenceLatencyP95ms > SLA.inferenceP95 * 0.7 ? "warn" : "ok";
  const brokerState: AccentState =
    health.brokerLagMs > SLA.brokerLag ? "breach" :
    health.brokerLagMs > SLA.brokerLag * 0.7 ? "warn" : "ok";
  const criticalState: AccentState = health.criticalAlertCount > 0 ? "breach" : "ok";

  const wsBadge: Record<typeof wsState, { label: string; cls: string; dot: string; sub: string }> = {
    connected:    { label: "WS LINK",      cls: "text-sentinel-green border-sentinel-green/40 bg-sentinel-green/5", dot: "bg-sentinel-green animate-pulse", sub: "sync ok · streaming" },
    reconnecting: { label: "RECONNECTING", cls: "text-sentinel-amber border-sentinel-amber/40 bg-sentinel-amber/5", dot: "bg-sentinel-amber animate-flicker", sub: "buffering events" },
    disconnected: { label: "OFFLINE",      cls: "text-sentinel-red border-sentinel-red/40 bg-sentinel-red/5", dot: "bg-sentinel-red", sub: "stale data" },
  };
  const ws = wsBadge[wsState];

  return (
    <div className="surface-1 rounded-md overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border/60">
        <Metric
          icon={Radio}
          label="Streams"
          value={`${health.activeStreams}`}
          unit={`/${health.totalStreams}`}
          sub={`${streamPct.toFixed(0)}% active`}
          state={streamState}
          progress={streamPct}
        />
        <Metric
          icon={Cpu}
          label="Inference p95"
          value={`${health.inferenceLatencyP95ms.toFixed(0)}`}
          unit="ms"
          sub={`SLA ≤ ${SLA.inferenceP95}ms`}
          state={inferenceState}
          history={inferenceHistory}
          historyMax={SLA.inferenceP95 * 1.4}
        />
        <Metric
          icon={Gauge}
          label="Broker Lag"
          value={`${health.brokerLagMs.toFixed(0)}`}
          unit="ms"
          sub={`SLA ≤ ${SLA.brokerLag}ms`}
          state={brokerState}
          history={brokerHistory}
          historyMax={SLA.brokerLag * 1.6}
        />
        <Metric
          icon={ShieldAlert}
          label="Critical"
          value={String(health.criticalAlertCount)}
          unit=""
          sub={health.criticalAlertCount > 0 ? "ACTION REQUIRED" : "all clear"}
          state={criticalState}
        />
        {/* WS link panel */}
        <div className="bg-card p-3 flex flex-col justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <Activity className={`h-3 w-3 ${STATE_TEXT[wsState === "connected" ? "ok" : wsState === "reconnecting" ? "warn" : "breach"]}`} aria-hidden />
            <span className="eyebrow">Real-time</span>
          </div>
          <div className={`mt-1 inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border w-fit ${ws.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${ws.dot}`} aria-hidden />
            <span className="text-[10px] font-mono uppercase tracking-[0.12em]">{ws.label}</span>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground">{ws.sub}</p>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon, label, value, unit, sub, state, progress, history, historyMax,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  unit: string;
  sub: string;
  state: AccentState;
  progress?: number;
  history?: number[];
  historyMax?: number;
}) {
  return (
    <div className="bg-card p-3 flex flex-col justify-between gap-2 relative">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${STATE_TEXT[state]}`} aria-hidden />
        <span className="eyebrow">{label}</span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-light data-num leading-none ${STATE_TEXT[state]}`}>{value}</span>
        {unit && <span className="text-[11px] font-mono text-muted-foreground">{unit}</span>}
      </div>

      {/* Progress bar (streams) or sparkline (latency, broker) */}
      {progress !== undefined && (
        <div className="h-[3px] w-full bg-border/60 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${STATE_BAR[state]} transition-all duration-500`} style={{ width: `${Math.min(100, progress)}%` }} aria-hidden />
        </div>
      )}
      {history !== undefined && history.length > 1 && (
        <Sparkline data={history} max={historyMax ?? Math.max(...history) * 1.2} state={state} />
      )}

      <p className="text-[10px] font-mono text-muted-foreground truncate">{sub}</p>
    </div>
  );
}

/** Tiny inline sparkline. Renders the last N values with a subtle trail. */
function Sparkline({ data, max, state }: { data: number[]; max: number; state: AccentState }) {
  const ref = useRef<SVGSVGElement>(null);
  // Map to 0-100 in viewBox with 36 width and 12 height
  const w = 100, h = 18;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - Math.min(h, (v / max) * h);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const last = data[data.length - 1];
  const lastX = w;
  const lastY = h - Math.min(h, (last / max) * h);

  // Animate dasharray on mount/update
  useEffect(() => {
    const path = ref.current?.querySelector("polyline");
    if (!path) return;
    const len = (path as SVGPolylineElement).getTotalLength?.() ?? 100;
    (path as SVGPolylineElement).style.strokeDasharray = `${len}`;
    (path as SVGPolylineElement).style.strokeDashoffset = `${len}`;
    requestAnimationFrame(() => {
      (path as SVGPolylineElement).style.transition = "stroke-dashoffset 600ms ease";
      (path as SVGPolylineElement).style.strokeDashoffset = "0";
    });
  }, [data]);

  const stroke = state === "breach" ? "hsl(var(--sentinel-red))" : state === "warn" ? "hsl(var(--sentinel-amber))" : "hsl(var(--sentinel-green))";

  return (
    <svg ref={ref} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-[18px]" aria-hidden>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
      <circle cx={lastX} cy={lastY} r="1.4" fill={stroke} />
    </svg>
  );
}
