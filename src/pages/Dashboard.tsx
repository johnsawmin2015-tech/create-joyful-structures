import { useMemo, useState, useEffect, useCallback } from "react";
import { Camera, Bell, Eye, Activity, AlertTriangle, Shield, Zap, TrendingUp, Wifi, Server, Database, Globe, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
};

// Count-up hook
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// Uptime counter
function UptimeCounter() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Date.now() - start), 73);
    return () => clearInterval(interval);
  }, []);
  const h = Math.floor(elapsed / 3600000);
  const m = Math.floor((elapsed % 3600000) / 60000);
  const s = Math.floor((elapsed % 60000) / 1000);
  const ms = Math.floor((elapsed % 1000) / 10);
  return (
    <span className="font-mono text-xs text-primary tabular-nums">
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}.{String(ms).padStart(2, "0")}
    </span>
  );
}

// SVG Threat Gauge
function ThreatGauge({ level }: { level: "NORMAL" | "GUARDED" | "ELEVATED" }) {
  const score = level === "ELEVATED" ? 85 : level === "GUARDED" ? 55 : 20;
  const color = level === "ELEVATED" ? "hsl(var(--sentinel-red))" : level === "GUARDED" ? "hsl(var(--sentinel-amber))" : "hsl(var(--sentinel-green))";
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (score / 100) * circumference * 0.75;

  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[135deg]">
        <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="6" strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeLinecap="round" />
        <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeDashoffset={dashOffset} strokeLinecap="round" className="transition-all duration-1000" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
        <span className="text-lg font-bold font-mono" style={{ color }}>{score}</span>
        <span className="text-[8px] text-muted-foreground uppercase tracking-wider">{level}</span>
      </div>
    </div>
  );
}

// Activity Ticker
function ActivityTicker({ events }: { events: string[] }) {
  if (events.length === 0) return null;
  const doubled = [...events, ...events];
  return (
    <div className="overflow-hidden border-y border-border bg-card/50 py-1.5">
      <div className="flex whitespace-nowrap animate-ticker">
        {doubled.map((e, i) => (
          <span key={i} className="inline-flex items-center gap-2 mx-6 text-[11px] font-mono text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}

// Mini sparkline SVG
function MiniSparkline({ data, color = "hsl(var(--primary))" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 80, h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// Network topology mini-map
function NetworkTopology() {
  const nodes = [
    { x: 50, y: 20, label: "API", color: "hsl(var(--primary))" },
    { x: 20, y: 55, label: "DB", color: "hsl(var(--sentinel-green))" },
    { x: 50, y: 55, label: "GPU", color: "hsl(var(--sentinel-amber))" },
    { x: 80, y: 55, label: "CAM", color: "hsl(var(--primary))" },
    { x: 35, y: 85, label: "STRG", color: "hsl(var(--sentinel-green))" },
    { x: 65, y: 85, label: "EDGE", color: "hsl(var(--sentinel-amber))" },
  ];
  const edges = [[0,1],[0,2],[0,3],[1,4],[2,4],[2,5],[3,5]];

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke="hsl(var(--border))" strokeWidth="0.5">
          <animate attributeName="stroke-opacity" values="0.3;0.8;0.3" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
        </line>
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r="6" fill="hsl(var(--card))" stroke={n.color} strokeWidth="1" />
          <circle cx={n.x} cy={n.y} r="2.5" fill={n.color}>
            <animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x={n.x} y={n.y + 14} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="5" fontFamily="monospace">{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

// Heatmap grid (7 days × 24 hours)
function DetectionHeatmap() {
  const heatData = useMemo(() => {
    return Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => Math.floor(Math.random() * 20))
    );
  }, []);
  const max = 20;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-1">
      <div className="flex gap-0.5 ml-8">
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} className="text-[7px] text-muted-foreground w-3 text-center font-mono">
            {i % 4 === 0 ? i : ""}
          </span>
        ))}
      </div>
      {heatData.map((row, d) => (
        <div key={d} className="flex items-center gap-0.5">
          <span className="text-[8px] text-muted-foreground w-7 text-right font-mono">{days[d]}</span>
          {row.map((v, h) => {
            const intensity = v / max;
            const hue = intensity > 0.6 ? 0 : intensity > 0.3 ? 38 : 185;
            return (
              <div
                key={h}
                className="w-3 h-3 rounded-[2px] transition-colors"
                style={{ backgroundColor: `hsla(${hue}, 70%, 50%, ${0.1 + intensity * 0.7})` }}
                title={`${days[d]} ${h}:00 — ${v} detections`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Event log
function EventLog({ alerts }: { alerts: any[] }) {
  const events = useMemo(() => {
    const base = (alerts ?? []).slice(0, 20).map((a) => ({
      time: format(new Date(a.created_at), "HH:mm:ss.SSS"),
      severity: a.severity,
      msg: `[${a.type.toUpperCase()}] ${a.message}`,
    }));
    if (base.length === 0) {
      const now = new Date();
      return Array.from({ length: 8 }, (_, i) => ({
        time: format(new Date(now.getTime() - i * 12000), "HH:mm:ss.SSS"),
        severity: ["low", "medium", "low", "high", "low", "medium", "critical", "low"][i],
        msg: [
          "[SYSTEM] All cameras operational",
          "[DETECT] Person detected — Lobby cam",
          "[SYSTEM] GPU cluster health OK",
          "[ALERT] Motion in restricted zone",
          "[SYSTEM] Database backup completed",
          "[DETECT] Vehicle — Parking Lot A",
          "[ALERT] Perimeter breach attempt",
          "[SYSTEM] API latency normal",
        ][i],
      }));
    }
    return base;
  }, [alerts]);

  const sevColor: Record<string, string> = {
    critical: "text-sentinel-red",
    high: "text-sentinel-red/80",
    medium: "text-sentinel-amber",
    low: "text-muted-foreground",
  };

  return (
    <div className="font-mono text-[10px] space-y-0.5 max-h-48 overflow-auto">
      {events.map((e, i) => (
        <div key={i} className="flex gap-2 py-0.5 px-1 rounded hover:bg-muted/30">
          <span className="text-muted-foreground shrink-0">{e.time}</span>
          <span className={`shrink-0 w-2 h-2 rounded-full mt-0.5 ${e.severity === "critical" || e.severity === "high" ? "bg-sentinel-red" : e.severity === "medium" ? "bg-sentinel-amber" : "bg-sentinel-green"}`} />
          <span className={sevColor[e.severity] ?? "text-foreground"}>{e.msg}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: cameras } = useQuery({
    queryKey: ["cameras"],
    queryFn: async () => {
      const { data } = await supabase.from("cameras").select("*");
      return data ?? [];
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["recent-alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alerts")
        .select("*, cameras(name)")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: detections } = useQuery({
    queryKey: ["all-detections"],
    queryFn: async () => {
      const { data } = await supabase.from("detections").select("*").order("created_at");
      return data ?? [];
    },
  });

  const onlineCameras = cameras?.filter((c) => c.status === "online").length ?? 0;
  const totalCameras = cameras?.length ?? 0;
  const unacknowledgedAlerts = alerts?.filter((a) => !a.acknowledged).length ?? 0;
  const criticalAlerts = alerts?.filter((a) => a.severity === "critical" && !a.acknowledged).length ?? 0;

  const animOnline = useCountUp(onlineCameras);
  const animDetections = useCountUp(detections?.length ?? 0);
  const animAlerts = useCountUp(unacknowledgedAlerts);

  const sparkline = useMemo(() => {
    const hours = Array.from({ length: 12 }, (_, i) => ({ h: i, count: 0 }));
    (detections ?? []).forEach((d) => {
      const h = new Date(d.created_at).getHours() % 12;
      hours[h].count++;
    });
    return hours;
  }, [detections]);

  const sparkData = useMemo(() => sparkline.map((s) => s.count), [sparkline]);

  const threatLevel: "NORMAL" | "GUARDED" | "ELEVATED" = criticalAlerts > 0 ? "ELEVATED" : unacknowledgedAlerts > 3 ? "GUARDED" : "NORMAL";

  const tickerEvents = useMemo(() => {
    if ((alerts ?? []).length > 0) {
      return alerts!.slice(0, 6).map((a) => `${format(new Date(a.created_at), "HH:mm")} ${a.type}: ${a.message.slice(0, 40)}`);
    }
    return [
      "14:23 DETECT: Person identified at Main Entrance",
      "14:21 SYSTEM: Camera CAM-03 health check passed",
      "14:19 DETECT: Vehicle entering Parking Lot A",
      "14:17 ALERT: Motion detected in restricted zone",
      "14:15 SYSTEM: AI model inference latency 23ms",
      "14:12 DETECT: 3 persons detected — Lobby",
    ];
  }, [alerts]);

  const severityColor: Record<string, string> = {
    critical: "bg-sentinel-red text-destructive-foreground",
    high: "bg-sentinel-red/70 text-destructive-foreground",
    medium: "bg-sentinel-amber text-primary-foreground",
    low: "bg-sentinel-green text-primary-foreground",
  };

  // Demo camera data when DB is empty
  const demoCameras = useMemo(() => {
    if (cameras && cameras.length > 0) return cameras;
    return [
      { id: "d1", name: "CAM-01", location: "Main Entrance", status: "online", resolution: "4K", fps: 30 },
      { id: "d2", name: "CAM-02", location: "Parking Lot A", status: "online", resolution: "1080p", fps: 30 },
      { id: "d3", name: "CAM-03", location: "Loading Dock", status: "online", resolution: "1080p", fps: 25 },
      { id: "d4", name: "CAM-04", location: "Lobby", status: "online", resolution: "4K", fps: 30 },
      { id: "d5", name: "CAM-05", location: "Server Room", status: "online", resolution: "1080p", fps: 15 },
      { id: "d6", name: "CAM-06", location: "Perimeter North", status: "offline", resolution: "1080p", fps: 30 },
      { id: "d7", name: "CAM-07", location: "Warehouse", status: "online", resolution: "720p", fps: 25 },
      { id: "d8", name: "CAM-08", location: "Rooftop", status: "error", resolution: "1080p", fps: 30 },
    ];
  }, [cameras]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Ticker */}
        <ActivityTicker events={tickerEvents} />

        {/* Header with threat gauge */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-3">
              Tactical Operations Dashboard
              <span className="text-[10px] font-mono text-muted-foreground">SESSION</span>
              <UptimeCounter />
            </p>
          </div>
          <ThreatGauge level={threatLevel} />
        </div>

        {/* Stats with sparklines */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="gradient-card border border-border rounded-lg p-4 glow-cyan animate-fade-in-up">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Cameras Online</span>
              </div>
              <MiniSparkline data={[3, 5, 4, 6, 5, 7, 6, 8]} color="hsl(var(--primary))" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold font-mono">{animOnline}/{totalCameras || 8}</span>
              <span className="text-xs text-sentinel-green flex items-center gap-0.5 mb-1"><ArrowUpRight className="h-3 w-3" />100%</span>
            </div>
          </div>

          <div className="gradient-card border border-border rounded-lg p-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-sentinel-red" />
                <span className="text-xs text-muted-foreground">Active Alerts</span>
              </div>
              <MiniSparkline data={[2, 4, 1, 5, 3, 2, 4, 3]} color="hsl(var(--sentinel-red))" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold font-mono">{animAlerts || 3}</span>
              <span className="text-xs text-sentinel-red flex items-center gap-0.5 mb-1"><ArrowUpRight className="h-3 w-3" />+12%</span>
            </div>
          </div>

          <div className="gradient-card border border-border rounded-lg p-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-sentinel-amber" />
                <span className="text-xs text-muted-foreground">Total Detections</span>
              </div>
              <MiniSparkline data={[10, 15, 8, 20, 18, 25, 22, 30]} color="hsl(var(--sentinel-amber))" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold font-mono">{animDetections || 1247}</span>
              <span className="text-xs text-sentinel-green flex items-center gap-0.5 mb-1"><ArrowUpRight className="h-3 w-3" />+8%</span>
            </div>
          </div>

          <div className="gradient-card border border-border rounded-lg p-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-sentinel-green" />
                <span className="text-xs text-muted-foreground">System Uptime</span>
              </div>
              <MiniSparkline data={[99, 99, 100, 99, 100, 100, 99, 100]} color="hsl(var(--sentinel-green))" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold font-mono">99.97%</span>
              <span className="text-xs text-sentinel-green flex items-center gap-0.5 mb-1"><ArrowUpRight className="h-3 w-3" />stable</span>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Detection Activity Chart */}
          <div className="lg:col-span-2 gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold">Detection Activity</h2>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={sparkline}>
                <XAxis dataKey="h" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Network Topology */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold">Network Topology</h2>
            </div>
            <div className="h-40">
              <NetworkTopology />
            </div>
          </div>
        </div>

        {/* Heatmap + Infrastructure */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-5 w-5 text-sentinel-amber" />
              <h2 className="text-sm font-semibold">Detection Heatmap (7-Day)</h2>
            </div>
            <DetectionHeatmap />
          </div>

          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-sentinel-amber" />
              <h2 className="text-sm font-semibold">Infrastructure Health</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "GPU Cluster", value: 67, icon: Server },
                { label: "Storage (2.4TB)", value: 56, icon: Database },
                { label: "Network I/O", value: 92, icon: Wifi },
                { label: "API Gateway", value: 15, icon: Globe },
              ].map((r) => (
                <div key={r.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <r.icon className="h-3 w-3" />{r.label}
                    </span>
                    <span className="font-mono">{r.value}%</span>
                  </div>
                  <Progress value={r.value} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Event log + Camera health matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-sentinel-amber" />
              <h2 className="text-sm font-semibold">Operations Log</h2>
              <span className="ml-auto text-[9px] font-mono text-sentinel-green animate-pulse">● LIVE</span>
            </div>
            <EventLog alerts={alerts ?? []} />
          </div>

          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold">Camera Health Matrix</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoCameras.map((cam) => (
                <div key={cam.id} className="flex items-center gap-2 p-2 rounded-md bg-background/50 border border-border/50 text-xs">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                    cam.status === "online" ? "bg-sentinel-green animate-pulse" : cam.status === "error" ? "bg-sentinel-red animate-flicker" : "bg-muted-foreground"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] truncate">{cam.name}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{cam.location}</p>
                  </div>
                  <span className="text-[8px] font-mono text-muted-foreground shrink-0">
                    {cam.status === "online" ? `${Math.floor(Math.random() * 20 + 5)}ms` : cam.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
