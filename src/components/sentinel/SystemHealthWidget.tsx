import { Activity, Cpu, Gauge, Radio, ShieldAlert } from "lucide-react";
import { SystemHealth } from "@/lib/sentinel-mock";

interface SystemHealthWidgetProps {
  health: SystemHealth;
  /** WebSocket connection state (drives stale-data badge) */
  wsState: "connected" | "reconnecting" | "disconnected";
}

const SLA = {
  inferenceP95: 150, // ms
  brokerLag: 50, // ms
};

/**
 * SystemHealthWidget
 * Stream count, inference latency p95, broker lag, active alert count.
 * Each metric has a defined SLA threshold; breach turns the metric amber/red.
 */
export function SystemHealthWidget({ health, wsState }: SystemHealthWidgetProps) {
  const streamPct = health.totalStreams > 0 ? (health.activeStreams / health.totalStreams) * 100 : 0;
  const inferenceState = health.inferenceLatencyP95ms > SLA.inferenceP95 ? "breach" : health.inferenceLatencyP95ms > SLA.inferenceP95 * 0.7 ? "warn" : "ok";
  const brokerState = health.brokerLagMs > SLA.brokerLag ? "breach" : health.brokerLagMs > SLA.brokerLag * 0.7 ? "warn" : "ok";
  const stateColor: Record<string, string> = { ok: "text-sentinel-green", warn: "text-sentinel-amber", breach: "text-sentinel-red" };

  const wsBadge: Record<typeof wsState, { label: string; cls: string; dot: string }> = {
    connected: { label: "WS LINK", cls: "text-sentinel-green border-sentinel-green/40", dot: "bg-sentinel-green animate-pulse" },
    reconnecting: { label: "RECONNECTING", cls: "text-sentinel-amber border-sentinel-amber/40", dot: "bg-sentinel-amber animate-flicker" },
    disconnected: { label: "OFFLINE", cls: "text-sentinel-red border-sentinel-red/40", dot: "bg-sentinel-red" },
  };
  const ws = wsBadge[wsState];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border rounded-lg overflow-hidden border border-border">
      <Metric
        icon={Radio}
        label="Streams"
        value={`${health.activeStreams}/${health.totalStreams}`}
        sub={`${streamPct.toFixed(0)}% active`}
        accent={streamPct < 90 ? "warn" : "ok"}
        stateColor={stateColor}
      />
      <Metric
        icon={Cpu}
        label="Inference p95"
        value={`${health.inferenceLatencyP95ms}ms`}
        sub={`SLA ≤ ${SLA.inferenceP95}ms`}
        accent={inferenceState}
        stateColor={stateColor}
      />
      <Metric
        icon={Gauge}
        label="Broker Lag"
        value={`${health.brokerLagMs}ms`}
        sub={`SLA ≤ ${SLA.brokerLag}ms`}
        accent={brokerState}
        stateColor={stateColor}
      />
      <Metric
        icon={ShieldAlert}
        label="Critical Alerts"
        value={String(health.criticalAlertCount)}
        sub={health.criticalAlertCount > 0 ? "ACTION REQUIRED" : "all clear"}
        accent={health.criticalAlertCount > 0 ? "breach" : "ok"}
        stateColor={stateColor}
      />
      <div className="bg-card p-3 flex flex-col justify-between">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-muted-foreground" />
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Real-time</span>
        </div>
        <div className={`mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded border w-fit ${ws.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${ws.dot}`} />
          <span className="text-[9px] font-mono">{ws.label}</span>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground mt-1">
          {wsState === "connected" ? "Sync OK" : wsState === "reconnecting" ? "Buffering events" : "Stale data"}
        </p>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  stateColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent: string;
  stateColor: Record<string, string>;
}) {
  return (
    <div className="bg-card p-3 flex flex-col justify-between gap-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${stateColor[accent]}`} />
        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-xl font-bold font-mono tabular-nums ${stateColor[accent]}`}>{value}</span>
      </div>
      <span className="text-[9px] font-mono text-muted-foreground">{sub}</span>
    </div>
  );
}
