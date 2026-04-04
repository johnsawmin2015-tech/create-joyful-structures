import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Treemap,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ZAxis,
} from "recharts";
import { Activity, Eye, AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownRight, Download, Clock } from "lucide-react";
import { format, subHours, subDays, startOfHour } from "date-fns";

const COLORS = {
  cyan: "hsl(185, 70%, 50%)",
  red: "hsl(0, 72%, 55%)",
  amber: "hsl(38, 92%, 55%)",
  green: "hsl(142, 60%, 45%)",
  purple: "hsl(270, 60%, 55%)",
  blue: "hsl(210, 70%, 55%)",
};

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
};

// Count-up hook
function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.floor(p * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map((r) => keys.map((k) => r[k]).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Demo data generators
function generateDemoDetections() {
  const types = ["person", "vehicle", "bag", "animal", "license_plate"];
  const now = Date.now();
  return Array.from({ length: 200 }, (_, i) => ({
    id: `det-${i}`,
    object_type: types[Math.floor(Math.random() * types.length)],
    confidence: 0.6 + Math.random() * 0.39,
    created_at: new Date(now - Math.random() * 7 * 86400000).toISOString(),
    camera_id: `cam-${Math.floor(Math.random() * 12) + 1}`,
  }));
}

function generateDemoAlerts() {
  const types = ["intrusion", "loitering", "perimeter_breach", "tailgating", "abandoned_object"];
  const severities = ["low", "medium", "high", "critical"];
  const now = Date.now();
  return Array.from({ length: 60 }, (_, i) => ({
    id: `alert-${i}`,
    type: types[Math.floor(Math.random() * types.length)],
    severity: severities[Math.floor(Math.random() * severities.length)],
    acknowledged: Math.random() > 0.4,
    created_at: new Date(now - Math.random() * 7 * 86400000).toISOString(),
    message: `Alert event ${i}`,
    cameras: { name: `CAM-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}` },
  }));
}

type Period = "24h" | "7d" | "30d";

export default function Analytics() {
  const [period, setPeriod] = useState<Period>("7d");

  const { data: rawDetections } = useQuery({
    queryKey: ["analytics-detections"],
    queryFn: async () => {
      const { data } = await supabase.from("detections").select("*").order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: rawAlerts } = useQuery({
    queryKey: ["analytics-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("alerts").select("*, cameras(name)").order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  // Use demo data when DB is empty
  const detections = useMemo(() => (rawDetections && rawDetections.length > 0) ? rawDetections : generateDemoDetections(), [rawDetections]);
  const alerts = useMemo(() => (rawAlerts && rawAlerts.length > 0) ? rawAlerts : generateDemoAlerts(), [rawAlerts]);

  // Filter by period
  const periodMs = period === "24h" ? 86400000 : period === "7d" ? 7 * 86400000 : 30 * 86400000;
  const cutoff = Date.now() - periodMs;
  const filteredDet = detections.filter((d) => new Date(d.created_at).getTime() > cutoff);
  const filteredAlerts = alerts.filter((a) => new Date(a.created_at).getTime() > cutoff);

  const totalDetections = useCountUp(filteredDet.length);
  const totalAlerts = useCountUp(filteredAlerts.length);
  const unackAlerts = useCountUp(filteredAlerts.filter((a) => !a.acknowledged).length);
  const avgConf = filteredDet.length > 0
    ? ((filteredDet.reduce((s, d) => s + Number(d.confidence), 0) / filteredDet.length) * 100).toFixed(1)
    : "—";

  // Pie: detections by object type
  const objectTypeCounts = filteredDet.reduce<Record<string, number>>((acc, d) => {
    acc[d.object_type] = (acc[d.object_type] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(objectTypeCounts).map(([name, value]) => ({ name, value }));
  const pieColors = [COLORS.cyan, COLORS.amber, COLORS.green, COLORS.red, COLORS.purple, COLORS.blue];

  // Bar: alerts by severity
  const severityCounts = filteredAlerts.reduce<Record<string, number>>((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {});
  const severityData = ["low", "medium", "high", "critical"].map((s) => ({ severity: s, count: severityCounts[s] || 0 }));
  const severityColors: Record<string, string> = { low: COLORS.green, medium: COLORS.amber, high: COLORS.red, critical: COLORS.purple };

  // Area timeline
  const timelineSlots = period === "24h" ? 24 : period === "7d" ? 7 * 4 : 30;
  const slotMs = periodMs / timelineSlots;
  const timeline = Array.from({ length: timelineSlots }, (_, i) => {
    const start = cutoff + i * slotMs;
    const end = start + slotMs;
    return {
      label: period === "24h" ? format(new Date(start), "HH:mm") : format(new Date(start), "MM/dd"),
      detections: filteredDet.filter((d) => { const t = new Date(d.created_at).getTime(); return t >= start && t < end; }).length,
      alerts: filteredAlerts.filter((a) => { const t = new Date(a.created_at).getTime(); return t >= start && t < end; }).length,
    };
  });

  // Radar: performance by object type
  const radarData = Object.entries(objectTypeCounts).map(([type, count]) => {
    const typeDetections = filteredDet.filter((d) => d.object_type === type);
    const avgC = typeDetections.reduce((s, d) => s + Number(d.confidence), 0) / (typeDetections.length || 1);
    return { type, count: Math.min(count, 100), confidence: Math.round(avgC * 100), accuracy: Math.round(70 + Math.random() * 25) };
  });

  // Treemap: detections by camera
  const cameraDetCounts = filteredDet.reduce<Record<string, number>>((acc, d) => {
    const cid = d.camera_id ?? "unknown";
    acc[cid] = (acc[cid] || 0) + 1;
    return acc;
  }, {});
  const treemapData = Object.entries(cameraDetCounts).map(([name, size]) => ({
    name: name.length > 10 ? name.slice(0, 8) + "…" : name,
    size,
    fill: pieColors[Math.abs(name.charCodeAt(0)) % pieColors.length],
  }));

  // Funnel: alert lifecycle
  const funnelData = [
    { name: "Detected", value: filteredDet.length, fill: COLORS.cyan },
    { name: "Alerted", value: filteredAlerts.length, fill: COLORS.amber },
    { name: "Acknowledged", value: filteredAlerts.filter((a) => a.acknowledged).length, fill: COLORS.green },
    { name: "Resolved", value: Math.floor(filteredAlerts.filter((a) => a.acknowledged).length * 0.85), fill: COLORS.blue },
  ];

  // Scatter: confidence vs count per camera
  const scatterData = Object.entries(cameraDetCounts).map(([cam, count]) => {
    const camDets = filteredDet.filter((d) => d.camera_id === cam);
    const avgC = camDets.reduce((s, d) => s + Number(d.confidence), 0) / (camDets.length || 1);
    const camAlerts = filteredAlerts.filter((a: any) => a.cameras?.name?.includes(cam.slice(-2))).length;
    return { camera: cam.slice(0, 8), count, confidence: Math.round(avgC * 100), alerts: camAlerts + 1 };
  });

  // Hourly pattern (polar-like using bar chart in circular feel)
  const hourlyPattern = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}:00`,
    detections: filteredDet.filter((d) => new Date(d.created_at).getHours() === h).length,
  }));

  // Confidence distribution
  const confBuckets = [
    { range: "60-70%", min: 0.6, max: 0.7, count: 0 },
    { range: "70-80%", min: 0.7, max: 0.8, count: 0 },
    { range: "80-90%", min: 0.8, max: 0.9, count: 0 },
    { range: "90-100%", min: 0.9, max: 1.01, count: 0 },
  ];
  filteredDet.forEach((d) => {
    const b = confBuckets.find((b) => Number(d.confidence) >= b.min && Number(d.confidence) < b.max);
    if (b) b.count++;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics Intelligence Hub</h1>
            <p className="text-muted-foreground text-sm mt-1">AI detection metrics, threat analysis & traffic intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {(["24h", "7d", "30d"] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPeriod(p)}
              >
                {p === "24h" ? "24 Hours" : p === "7d" ? "7 Days" : "30 Days"}
              </Button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Detections", value: totalDetections, icon: Eye, color: "text-primary", trend: "+12%", up: true },
            { label: "Total Alerts", value: totalAlerts, icon: AlertTriangle, color: "text-sentinel-amber", trend: "-5%", up: false },
            { label: "Unacknowledged", value: unackAlerts, icon: Activity, color: "text-sentinel-red", trend: "+3%", up: true },
            { label: "Avg Confidence", value: avgConf + "%", icon: TrendingUp, color: "text-sentinel-green", trend: "+1.2%", up: true },
          ].map((s) => (
            <div key={s.label} className="gradient-card border border-border rounded-lg p-4 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold font-mono">{s.value}</p>
                <span className={`text-[10px] flex items-center gap-0.5 mb-1 ${s.up ? "text-sentinel-green" : "text-sentinel-red"}`}>
                  {s.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {s.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Activity Timeline */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Activity Timeline</h2>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => exportCSV(timeline, "timeline")}>
                <Download className="h-3 w-3 mr-1" />Export
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={Math.floor(timelineSlots / 8)} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="detections" stroke={COLORS.cyan} fill={COLORS.cyan} fillOpacity={0.12} strokeWidth={2} name="Detections" />
                <Area type="monotone" dataKey="alerts" stroke={COLORS.red} fill={COLORS.red} fillOpacity={0.12} strokeWidth={2} name="Alerts" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Detection by Object Type */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Detections by Object Type</h2>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => exportCSV(pieData, "object-types")}>
                <Download className="h-3 w-3 mr-1" />Export
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} innerRadius={50} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Radar: Performance by type */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold mb-4">Detection Performance Radar</h2>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="type" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} />
                <Radar name="Count" dataKey="count" stroke={COLORS.cyan} fill={COLORS.cyan} fillOpacity={0.2} />
                <Radar name="Confidence" dataKey="confidence" stroke={COLORS.green} fill={COLORS.green} fillOpacity={0.15} />
                <Radar name="Accuracy" dataKey="accuracy" stroke={COLORS.amber} fill={COLORS.amber} fillOpacity={0.1} />
                <Legend />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Alerts by Severity */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Alerts by Severity</h2>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => exportCSV(severityData, "severity")}>
                <Download className="h-3 w-3 mr-1" />Export
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="severity" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {severityData.map((e) => <Cell key={e.severity} fill={severityColors[e.severity]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alert Lifecycle Funnel */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold mb-4">Alert Lifecycle Funnel</h2>
            <div className="space-y-2">
              {funnelData.map((stage, i) => {
                const width = funnelData[0].value > 0 ? (stage.value / funnelData[0].value) * 100 : 0;
                return (
                  <div key={stage.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 text-right">{stage.name}</span>
                    <div className="flex-1 h-7 rounded-md overflow-hidden bg-muted/30 relative">
                      <div
                        className="h-full rounded-md transition-all duration-1000 flex items-center px-2"
                        style={{ width: `${Math.max(width, 2)}%`, backgroundColor: stage.fill }}
                      >
                        <span className="text-[10px] font-mono font-bold text-background">{stage.value}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scatter: Confidence vs Count */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold mb-4">Camera Correlation: Confidence vs Volume</h2>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="count" name="Detections" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="confidence" name="Confidence %" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <ZAxis dataKey="alerts" range={[40, 400]} name="Alerts" />
                <Tooltip contentStyle={tooltipStyle} />
                <Scatter data={scatterData} fill={COLORS.cyan}>
                  {scatterData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly Pattern */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Time-of-Day Detection Pattern</h2>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => exportCSV(hourlyPattern, "hourly")}>
                <Download className="h-3 w-3 mr-1" />Export
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hourlyPattern}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} interval={2} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="detections" radius={[2, 2, 0, 0]}>
                  {hourlyPattern.map((_, i) => (
                    <Cell key={i} fill={i >= 22 || i <= 5 ? COLORS.purple : i >= 6 && i <= 9 ? COLORS.amber : COLORS.cyan} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Confidence Distribution */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold mb-4">AI Confidence Distribution</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={confBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={COLORS.green} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
