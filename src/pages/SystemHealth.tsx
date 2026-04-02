import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Server, Cpu, HardDrive, Wifi, Activity, CheckCircle2,
  AlertTriangle, XCircle, Clock, Zap, Database, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";

// Simulated microservice statuses
const SERVICES = [
  { name: "auth-service", health: "healthy" as const, latency: 12, uptime: 99.99, cpu: 18, mem: 34 },
  { name: "camera-service", health: "healthy" as const, latency: 8, uptime: 99.98, cpu: 22, mem: 41 },
  { name: "inference-service", health: "healthy" as const, latency: 45, uptime: 99.95, cpu: 78, mem: 72 },
  { name: "alert-service", health: "healthy" as const, latency: 15, uptime: 99.97, cpu: 12, mem: 28 },
  { name: "recording-service", health: "degraded" as const, latency: 120, uptime: 99.80, cpu: 55, mem: 68 },
  { name: "analytics-service", health: "healthy" as const, latency: 22, uptime: 99.96, cpu: 35, mem: 45 },
  { name: "notification-service", health: "healthy" as const, latency: 18, uptime: 99.99, cpu: 8, mem: 22 },
  { name: "user-service", health: "healthy" as const, latency: 10, uptime: 99.99, cpu: 6, mem: 18 },
];

const GPU_NODES = [
  { id: "gpu-node-01", gpu: "NVIDIA T4", util: 72, memory: 12.4, memTotal: 16, temp: 68, power: 55, jobs: 4 },
  { id: "gpu-node-02", gpu: "NVIDIA T4", util: 58, memory: 9.8, memTotal: 16, temp: 62, power: 48, jobs: 3 },
  { id: "gpu-node-03", gpu: "NVIDIA A100", util: 84, memory: 52.1, memTotal: 80, temp: 74, power: 220, jobs: 8 },
  { id: "gpu-node-04", gpu: "NVIDIA A100", util: 41, memory: 28.6, memTotal: 80, temp: 55, power: 140, jobs: 2 },
];

const KAFKA_TOPICS = [
  { topic: "camera.frames.raw", partitions: 8, lag: 120, throughput: "2.4k/s" },
  { topic: "detections.output", partitions: 4, lag: 15, throughput: "890/s" },
  { topic: "alerts.events", partitions: 2, lag: 0, throughput: "42/s" },
  { topic: "analytics.aggregated", partitions: 2, lag: 5, throughput: "120/s" },
];

const STORAGE_BUCKETS = [
  { name: "Video Recordings", used: 2.8, total: 5.0, unit: "TB", retention: "30 days" },
  { name: "Thumbnails", used: 180, total: 500, unit: "GB", retention: "90 days" },
  { name: "Evidence Packages", used: 45, total: 200, unit: "GB", retention: "Indefinite" },
  { name: "Model Artifacts", used: 12, total: 50, unit: "GB", retention: "Versioned" },
];

const healthConfig = {
  healthy: { color: "bg-sentinel-green/20 text-sentinel-green", icon: CheckCircle2 },
  degraded: { color: "bg-sentinel-amber/20 text-sentinel-amber", icon: AlertTriangle },
  down: { color: "bg-sentinel-red/20 text-sentinel-red", icon: XCircle },
};

function useTickingMetrics() {
  const [uptimeHistory, setUptimeHistory] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      time: `${30 - i}m`,
      uptime: 99.9 + Math.random() * 0.09,
      latency: 20 + Math.random() * 30,
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setUptimeHistory((prev) => [
        ...prev.slice(1),
        {
          time: "now",
          uptime: 99.9 + Math.random() * 0.09,
          latency: 20 + Math.random() * 30,
        },
      ]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return uptimeHistory;
}

const CHART_COLORS = {
  cyan: "hsl(185, 70%, 50%)",
  green: "hsl(142, 60%, 45%)",
  amber: "hsl(38, 92%, 55%)",
  red: "hsl(0, 72%, 55%)",
};

const tooltipStyle = {
  background: "hsl(220, 18%, 10%)",
  border: "1px solid hsl(220, 14%, 18%)",
  borderRadius: 8,
  color: "hsl(210, 20%, 92%)",
};

export default function SystemHealth() {
  const uptimeHistory = useTickingMetrics();

  const overallHealth = SERVICES.every((s) => s.health === "healthy")
    ? "All Systems Operational"
    : SERVICES.some((s) => s.health === "down")
    ? "Service Outage Detected"
    : "Degraded Performance";

  const overallColor = SERVICES.every((s) => s.health === "healthy")
    ? "text-sentinel-green"
    : SERVICES.some((s) => s.health === "down")
    ? "text-sentinel-red"
    : "text-sentinel-amber";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Health Monitor</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Service dependency graph, resource utilization & SLA tracking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${overallColor}`} />
            <span className={`text-sm font-semibold ${overallColor}`}>{overallHealth}</span>
          </div>
        </div>

        {/* SLA Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Platform Uptime", value: "99.97%", target: "SLA 99.9%", ok: true },
            { label: "Avg Latency (P95)", value: "32ms", target: "Target ≤80ms", ok: true },
            { label: "MTTR", value: "1m 42s", target: "Target ≤2min", ok: true },
            { label: "Active Streams", value: "8 / 64", target: "Capacity", ok: true },
          ].map((m) => (
            <div key={m.label} className="gradient-card border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-2xl font-bold font-mono mt-1">{m.value}</p>
              <p className={`text-[10px] mt-1 ${m.ok ? "text-sentinel-green" : "text-sentinel-red"}`}>
                {m.target}
              </p>
            </div>
          ))}
        </div>

        {/* Uptime + Latency chart */}
        <div className="gradient-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Pipeline Latency (30min rolling)
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={uptimeHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} domain={[0, 80]} unit="ms" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="latency"
                stroke={CHART_COLORS.cyan}
                fill={CHART_COLORS.cyan}
                fillOpacity={0.12}
                strokeWidth={2}
                name="P95 Latency"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Services grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Microservice Health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {SERVICES.map((svc) => {
              const cfg = healthConfig[svc.health];
              const Icon = cfg.icon;
              return (
                <div key={svc.name} className="gradient-card border border-border rounded-lg p-4 hover:border-glow transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold truncate">{svc.name}</span>
                    <Badge className={`text-[9px] ${cfg.color}`}>
                      <Icon className="h-3 w-3 mr-1" />
                      {svc.health}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Latency</p>
                      <p className="text-xs font-mono">{svc.latency}ms</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Uptime</p>
                      <p className="text-xs font-mono">{svc.uptime}%</p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-muted-foreground">CPU</span>
                      <span className="font-mono">{svc.cpu}%</span>
                    </div>
                    <Progress value={svc.cpu} className="h-1" />
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-muted-foreground">Memory</span>
                      <span className="font-mono">{svc.mem}%</span>
                    </div>
                    <Progress value={svc.mem} className="h-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GPU nodes */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-sentinel-amber" />
            GPU Compute Nodes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GPU_NODES.map((node) => (
              <div key={node.id} className="gradient-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold font-mono">{node.id}</p>
                    <p className="text-xs text-muted-foreground">{node.gpu}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {node.jobs} jobs
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-[9px] text-muted-foreground">Utilization</p>
                    <p className={`text-sm font-bold font-mono ${node.util > 80 ? "text-sentinel-amber" : "text-sentinel-green"}`}>
                      {node.util}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">VRAM</p>
                    <p className="text-sm font-bold font-mono">{node.memory}/{node.memTotal}G</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Temp</p>
                    <p className={`text-sm font-bold font-mono ${node.temp > 70 ? "text-sentinel-amber" : "text-foreground"}`}>
                      {node.temp}°C
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Power</p>
                    <p className="text-sm font-bold font-mono">{node.power}W</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[9px] mb-1">
                    <span className="text-muted-foreground">GPU Load</span>
                    <span className="font-mono">{node.util}%</span>
                  </div>
                  <Progress value={node.util} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kafka + Storage row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kafka consumer lag */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Message Broker Topics
            </h2>
            <div className="space-y-3">
              {KAFKA_TOPICS.map((t) => (
                <div key={t.topic} className="flex items-center justify-between p-3 bg-background/50 rounded-md border border-border/50">
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-medium truncate">{t.topic}</p>
                    <p className="text-[10px] text-muted-foreground">{t.partitions} partitions · {t.throughput}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`text-sm font-bold font-mono ${t.lag > 100 ? "text-sentinel-amber" : t.lag > 0 ? "text-foreground" : "text-sentinel-green"}`}>
                      {t.lag}
                    </p>
                    <p className="text-[9px] text-muted-foreground">consumer lag</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Storage usage */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-sentinel-green" />
              Storage Utilization
            </h2>
            <div className="space-y-4">
              {STORAGE_BUCKETS.map((b) => {
                const pct = (b.used / b.total) * 100;
                return (
                  <div key={b.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{b.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {b.used} / {b.total} {b.unit}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      Retention: {b.retention} · {pct.toFixed(0)}% used
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
