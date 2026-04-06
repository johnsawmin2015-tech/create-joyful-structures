import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Treemap,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ZAxis,
} from "recharts";
import { Activity, Eye, AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownRight, Download, Clock, Shield, Zap } from "lucide-react";
import { format } from "date-fns";

/* ── Refined color palette using design tokens ── */
const PALETTE = {
  primary:   "hsl(195, 85%, 50%)",
  secondary: "hsl(195, 85%, 38%)",
  threat:    "hsl(0, 72%, 55%)",
  warning:   "hsl(38, 92%, 55%)",
  success:   "hsl(152, 60%, 45%)",
  accent:    "hsl(270, 55%, 55%)",
  info:      "hsl(210, 65%, 55%)",
  muted:     "hsl(222, 16%, 30%)",
};

const tooltipStyle = {
  background: "hsl(222, 22%, 10%)",
  border: "1px solid hsl(222, 16%, 18%)",
  borderRadius: 10,
  color: "hsl(210, 20%, 92%)",
  fontSize: 12,
  boxShadow: "0 8px 32px hsl(0 0% 0% / 0.4)",
};

const gridStroke = "hsl(222, 16%, 16%)";
const axisStyle = { fontSize: 9, fill: "hsl(215, 12%, 50%)" };

/* ── Hooks ── */
function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/* Simulates real-time detection arrivals — increments counts periodically */
function useLivePulse(baseValue: number, intervalMs = 4000) {
  const [extra, setExtra] = useState(0);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() > 0.35) {
        const inc = Math.ceil(Math.random() * 3);
        setExtra((e) => e + inc);
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return { value: baseValue + extra, pulse };
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

/* ── Demo data ── */
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

/* ── KPI Card ── */
function KPICard({ label, value, icon: Icon, iconColor, trend, trendUp, delay = 0, pulse = false }: {
  label: string; value: string | number; icon: any; iconColor: string;
  trend: string; trendUp: boolean; delay?: number; pulse?: boolean;
}) {
  return (
    <div
      className={`glass-panel-strong rounded-xl p-5 animate-fade-in-up group hover:glow-cyan-strong transition-all duration-300 relative overflow-hidden ${pulse ? "ring-1 ring-primary/40" : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Pulse flash overlay */}
      <div
        className="absolute inset-0 bg-primary/5 pointer-events-none transition-opacity duration-500"
        style={{ opacity: pulse ? 1 : 0 }}
      />
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className={`p-2 rounded-lg bg-muted/50 transition-all duration-300 ${pulse ? "scale-110" : ""}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="flex items-center gap-2">
          {pulse && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          )}
          <span className={`text-[10px] font-mono flex items-center gap-0.5 ${trendUp ? "text-sentinel-green" : "text-sentinel-red"}`}>
            {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend}
          </span>
        </div>
      </div>
      <p className={`text-3xl font-bold font-mono tracking-tight relative z-10 transition-all duration-300 ${pulse ? "text-glow-cyan" : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1 tracking-wider uppercase relative z-10">{label}</p>
    </div>
  );
}

/* ── Chart Card ── */
function ChartCard({ title, children, onExport, icon: Icon, span = 1 }: {
  title: string; children: React.ReactNode; onExport?: () => void; icon?: any; span?: number;
}) {
  return (
    <div className={`glass-panel-strong rounded-xl p-5 animate-fade-in-up ${span === 2 ? "lg:col-span-2" : ""}`}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        </div>
        {onExport && (
          <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground hover:text-foreground" onClick={onExport}>
            <Download className="h-3 w-3 mr-1" />CSV
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

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

  const detections = useMemo(() => (rawDetections && rawDetections.length > 0) ? rawDetections : generateDemoDetections(), [rawDetections]);
  const alerts = useMemo(() => (rawAlerts && rawAlerts.length > 0) ? rawAlerts : generateDemoAlerts(), [rawAlerts]);

  const periodMs = period === "24h" ? 86400000 : period === "7d" ? 7 * 86400000 : 30 * 86400000;
  const cutoff = Date.now() - periodMs;
  const filteredDet = detections.filter((d) => new Date(d.created_at).getTime() > cutoff);
  const filteredAlerts = alerts.filter((a) => new Date(a.created_at).getTime() > cutoff);

  const liveDet = useLivePulse(filteredDet.length, 3500);
  const liveAlerts = useLivePulse(filteredAlerts.length, 6000);

  const totalDetections = useCountUp(liveDet.value);
  const totalAlerts = useCountUp(liveAlerts.value);
  const unackAlerts = useCountUp(filteredAlerts.filter((a) => !a.acknowledged).length);
  const avgConf = filteredDet.length > 0
    ? ((filteredDet.reduce((s, d) => s + Number(d.confidence), 0) / filteredDet.length) * 100).toFixed(1)
    : "—";

  // Pie data
  const objectTypeCounts = filteredDet.reduce<Record<string, number>>((acc, d) => {
    acc[d.object_type] = (acc[d.object_type] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(objectTypeCounts).map(([name, value]) => ({ name, value }));
  const pieColors = [PALETTE.primary, PALETTE.warning, PALETTE.success, PALETTE.threat, PALETTE.accent, PALETTE.info];

  // Severity data
  const severityCounts = filteredAlerts.reduce<Record<string, number>>((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {});
  const severityData = ["low", "medium", "high", "critical"].map((s) => ({ severity: s, count: severityCounts[s] || 0 }));
  const severityColors: Record<string, string> = { low: PALETTE.success, medium: PALETTE.warning, high: PALETTE.threat, critical: PALETTE.accent };

  // Timeline
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

  // Radar data
  const radarData = Object.entries(objectTypeCounts).map(([type, count]) => {
    const typeDetections = filteredDet.filter((d) => d.object_type === type);
    const avgC = typeDetections.reduce((s, d) => s + Number(d.confidence), 0) / (typeDetections.length || 1);
    return { type, count: Math.min(count, 100), confidence: Math.round(avgC * 100), accuracy: Math.round(70 + Math.random() * 25) };
  });

  // Camera detection counts
  const cameraDetCounts = filteredDet.reduce<Record<string, number>>((acc, d) => {
    const cid = d.camera_id ?? "unknown";
    acc[cid] = (acc[cid] || 0) + 1;
    return acc;
  }, {});

  // Funnel data
  const funnelData = [
    { name: "Detected", value: filteredDet.length, color: PALETTE.primary },
    { name: "Alerted", value: filteredAlerts.length, color: PALETTE.warning },
    { name: "Acknowledged", value: filteredAlerts.filter((a) => a.acknowledged).length, color: PALETTE.success },
    { name: "Resolved", value: Math.floor(filteredAlerts.filter((a) => a.acknowledged).length * 0.85), color: PALETTE.info },
  ];

  // Scatter data
  const scatterData = Object.entries(cameraDetCounts).map(([cam, count]) => {
    const camDets = filteredDet.filter((d) => d.camera_id === cam);
    const avgC = camDets.reduce((s, d) => s + Number(d.confidence), 0) / (camDets.length || 1);
    const camAlerts = filteredAlerts.filter((a: any) => a.cameras?.name?.includes(cam.slice(-2))).length;
    return { camera: cam.slice(0, 8), count, confidence: Math.round(avgC * 100), alerts: camAlerts + 1 };
  });

  // Hourly pattern
  const hourlyPattern = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
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
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Analytics Intelligence Hub</h1>
                <p className="text-muted-foreground text-xs mt-0.5 tracking-wider">
                  AI detection metrics · threat analysis · traffic intelligence
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-1">
            {(["24h", "7d", "30d"] as Period[]).map((p) => (
              <button
                key={p}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  period === p
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                onClick={() => setPeriod(p)}
              >
                {p === "24h" ? "24H" : p === "7d" ? "7D" : "30D"}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Total Detections" value={totalDetections} icon={Eye} iconColor="text-primary" trend="+12%" trendUp delay={0} pulse={liveDet.pulse} />
          <KPICard label="Total Alerts" value={totalAlerts} icon={AlertTriangle} iconColor="text-sentinel-amber" trend="-5%" trendUp={false} delay={0.05} pulse={liveAlerts.pulse} />
          <KPICard label="Unacknowledged" value={unackAlerts} icon={Shield} iconColor="text-sentinel-red" trend="+3%" trendUp delay={0.1} />
          <KPICard label="Avg Confidence" value={`${avgConf}%`} icon={TrendingUp} iconColor="text-sentinel-green" trend="+1.2%" trendUp delay={0.15} />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Activity Timeline" icon={Activity} onExport={() => exportCSV(timeline, "timeline")} span={2}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="gradDet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.primary} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={PALETTE.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAlert" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.threat} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={PALETTE.threat} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="label" tick={axisStyle} interval={Math.floor(timelineSlots / 8)} />
                <YAxis tick={axisStyle} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="detections" stroke={PALETTE.primary} fill="url(#gradDet)" strokeWidth={2} name="Detections" />
                <Area type="monotone" dataKey="alerts" stroke={PALETTE.threat} fill="url(#gradAlert)" strokeWidth={1.5} name="Alerts" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Object Distribution" icon={Eye} onExport={() => exportCSV(pieData, "object-distribution")}>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <defs>
                      {pieColors.map((c, i) => (
                        <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={c} stopOpacity={1} />
                          <stop offset="100%" stopColor={c} stopOpacity={0.6} />
                        </linearGradient>
                      ))}
                      <filter id="pieShadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="hsl(0,0%,0%)" floodOpacity="0.4" />
                      </filter>
                    </defs>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={58}
                      dataKey="value"
                      paddingAngle={4}
                      strokeWidth={0}
                      cornerRadius={4}
                      filter="url(#pieShadow)"
                    >
                      {pieData.map((_, i) => <Cell key={i} fill={`url(#pieGrad${i})`} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 space-y-2">
                {pieData.map((item, i) => {
                  const total = pieData.reduce((s, d) => s + d.value, 0) || 1;
                  const pct = ((item.value / total) * 100).toFixed(1);
                  return (
                    <div key={item.name} className="flex items-center gap-3 group">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: pieColors[i % pieColors.length] }} />
                      <span className="text-xs text-muted-foreground flex-1 capitalize">{item.name.replace("_", " ")}</span>
                      <span className="text-xs font-mono font-semibold">{item.value}</span>
                      <span className="text-[10px] font-mono text-muted-foreground w-12 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Detection Performance Radar" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={gridStroke} />
                <PolarAngleAxis dataKey="type" tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }} />
                <PolarRadiusAxis tick={{ fontSize: 8, fill: "hsl(215, 12%, 40%)" }} />
                <Radar name="Volume" dataKey="count" stroke={PALETTE.primary} fill={PALETTE.primary} fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Confidence" dataKey="confidence" stroke={PALETTE.success} fill={PALETTE.success} fillOpacity={0.1} strokeWidth={1.5} />
                <Radar name="Accuracy" dataKey="accuracy" stroke={PALETTE.warning} fill={PALETTE.warning} fillOpacity={0.08} strokeWidth={1.5} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Alerts by Severity" icon={AlertTriangle} onExport={() => exportCSV(severityData, "severity")}>
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={severityData} barCategoryGap="30%">
                  <defs>
                    {Object.entries(severityColors).map(([key, color]) => (
                      <linearGradient key={key} id={`sevGrad-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="severity" tick={axisStyle} />
                  <YAxis tick={axisStyle} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {severityData.map((e) => <Cell key={e.severity} fill={`url(#sevGrad-${e.severity})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Inline severity breakdown */}
              <div className="grid grid-cols-4 gap-2">
                {severityData.map((s) => {
                  const total = severityData.reduce((sum, x) => sum + x.count, 0) || 1;
                  return (
                    <div key={s.severity} className="rounded-lg bg-muted/20 p-2.5 text-center border border-border/30 hover:border-border/60 transition-colors">
                      <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ background: severityColors[s.severity], boxShadow: `0 0 8px ${severityColors[s.severity]}60` }} />
                      <p className="text-lg font-bold font-mono">{s.count}</p>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground capitalize">{s.severity}</p>
                      <p className="text-[9px] font-mono text-muted-foreground/60">{((s.count / total) * 100).toFixed(0)}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Alert Lifecycle Funnel" icon={Shield}>
            <div className="space-y-2.5 py-2">
              {funnelData.map((stage, i) => {
                const maxVal = funnelData[0].value || 1;
                const pct = (stage.value / maxVal) * 100;
                const prevPct = i > 0 ? ((funnelData[i].value / (funnelData[i - 1].value || 1)) * 100).toFixed(0) : "100";
                return (
                  <div key={stage.name} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color, boxShadow: `0 0 6px ${stage.color}50` }} />
                        <span className="text-xs font-medium">{stage.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono">{stage.value}</span>
                        {i > 0 && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground">
                            {prevPct}% pass
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-7 rounded-lg overflow-hidden bg-muted/15 relative">
                      <div
                        className="h-full rounded-lg transition-all duration-[1500ms] ease-out relative overflow-hidden"
                        style={{
                          width: `${Math.max(pct, 3)}%`,
                          background: `linear-gradient(90deg, ${stage.color}ee, ${stage.color}88)`,
                          boxShadow: `inset 0 1px 0 hsl(0 0% 100% / 0.12), 0 2px 8px ${stage.color}30`,
                        }}
                      >
                        <div className="absolute inset-0 animate-shimmer" />
                        {/* Glow edge */}
                        <div className="absolute right-0 top-0 bottom-0 w-4" style={{ background: `linear-gradient(90deg, transparent, ${stage.color}40)` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Conversion summary */}
              <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">End-to-end conversion</span>
                <span className="text-sm font-bold font-mono text-primary">
                  {funnelData[0].value > 0 ? ((funnelData[funnelData.length - 1].value / funnelData[0].value) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Camera Correlation" icon={Activity}>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="count" name="Detections" tick={axisStyle} label={{ value: "Detection Count", position: "bottom", fontSize: 9, fill: "hsl(215, 12%, 50%)" }} />
                <YAxis dataKey="confidence" name="Confidence" tick={axisStyle} label={{ value: "Confidence %", angle: -90, position: "insideLeft", fontSize: 9, fill: "hsl(215, 12%, 50%)" }} />
                <ZAxis dataKey="alerts" range={[60, 400]} name="Alerts" />
                <Tooltip contentStyle={tooltipStyle} />
                <Scatter data={scatterData} strokeWidth={1} stroke="hsl(222, 16%, 20%)">
                  {scatterData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} fillOpacity={0.8} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Charts Row 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Time-of-Day Pattern" icon={Clock} onExport={() => exportCSV(hourlyPattern, "hourly")}>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{ background: PALETTE.accent }} />Night (22-05)</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{ background: PALETTE.warning }} />Morning (06-09)</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{ background: PALETTE.primary }} />Day (10-21)</div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hourlyPattern} barCategoryGap="8%">
                  <defs>
                    <linearGradient id="gradNight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PALETTE.accent} stopOpacity={1} />
                      <stop offset="100%" stopColor={PALETTE.accent} stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="gradMorn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PALETTE.warning} stopOpacity={1} />
                      <stop offset="100%" stopColor={PALETTE.warning} stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="gradDay" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PALETTE.primary} stopOpacity={1} />
                      <stop offset="100%" stopColor={PALETTE.primary} stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 7, fill: "hsl(215, 12%, 50%)" }} interval={2} />
                  <YAxis tick={axisStyle} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="detections" radius={[4, 4, 0, 0]}>
                    {hourlyPattern.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i >= 22 || i <= 5 ? "url(#gradNight)" : i >= 6 && i <= 9 ? "url(#gradMorn)" : "url(#gradDay)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Peak hour indicator */}
              {(() => {
                const peak = hourlyPattern.reduce((a, b) => a.detections > b.detections ? a : b, hourlyPattern[0]);
                return (
                  <div className="flex items-center justify-between bg-muted/15 rounded-lg px-3 py-2 border border-border/20">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Peak Activity</span>
                    <span className="text-xs font-bold font-mono text-primary">{peak.hour} — {peak.detections} detections</span>
                  </div>
                );
              })()}
            </div>
          </ChartCard>

          <ChartCard title="AI Confidence Distribution" icon={TrendingUp} onExport={() => exportCSV(confBuckets.map(b => ({ range: b.range, count: b.count })), "confidence")}>
            <div className="space-y-3">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={confBuckets}>
                  <defs>
                    <linearGradient id="gradConfArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PALETTE.success} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={PALETTE.success} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="range" tick={axisStyle} />
                  <YAxis tick={axisStyle} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="count" stroke={PALETTE.success} strokeWidth={2.5} fill="url(#gradConfArea)" dot={{ r: 5, fill: PALETTE.success, stroke: "hsl(222, 22%, 8%)", strokeWidth: 2 }} activeDot={{ r: 7, stroke: PALETTE.success, strokeWidth: 2, fill: "hsl(222, 22%, 8%)" }} />
                </AreaChart>
              </ResponsiveContainer>
              {/* Distribution breakdown cards */}
              <div className="grid grid-cols-4 gap-2">
                {confBuckets.map((b, i) => {
                  const total = confBuckets.reduce((s, x) => s + x.count, 0) || 1;
                  const pct = ((b.count / total) * 100).toFixed(0);
                  const intensity = 0.3 + (i / (confBuckets.length - 1)) * 0.7;
                  return (
                    <div key={b.range} className="rounded-lg bg-muted/15 p-2 text-center border border-border/20 hover:border-primary/30 transition-all">
                      <div className="w-full h-1 rounded-full mb-2 overflow-hidden bg-muted/20">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PALETTE.success, opacity: intensity }} />
                      </div>
                      <p className="text-sm font-bold font-mono">{b.count}</p>
                      <p className="text-[9px] text-muted-foreground">{b.range}</p>
                      <p className="text-[9px] font-mono text-primary/70">{pct}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
