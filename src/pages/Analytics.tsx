import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity, Eye, AlertTriangle, TrendingUp } from "lucide-react";
import { format, subHours, startOfHour } from "date-fns";

const CHART_COLORS = {
  cyan: "hsl(185, 70%, 50%)",
  red: "hsl(0, 72%, 55%)",
  amber: "hsl(38, 92%, 55%)",
  green: "hsl(142, 60%, 45%)",
  purple: "hsl(270, 60%, 55%)",
  blue: "hsl(210, 70%, 55%)",
};

export default function Analytics() {
  const { data: detections } = useQuery({
    queryKey: ["analytics-detections"],
    queryFn: async () => {
      const { data } = await supabase.from("detections").select("*").order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["analytics-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("alerts").select("*, cameras(name)").order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  // Detections by object type (pie)
  const objectTypeCounts = (detections ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.object_type] = (acc[d.object_type] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(objectTypeCounts).map(([name, value]) => ({ name, value }));
  const pieColors = [CHART_COLORS.cyan, CHART_COLORS.amber, CHART_COLORS.green, CHART_COLORS.red, CHART_COLORS.purple, CHART_COLORS.blue];

  // Alerts by severity (bar)
  const severityCounts = (alerts ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {});
  const severityData = ["low", "medium", "high", "critical"].map((s) => ({ severity: s, count: severityCounts[s] || 0 }));
  const severityColors: Record<string, string> = { low: CHART_COLORS.green, medium: CHART_COLORS.amber, high: CHART_COLORS.red, critical: CHART_COLORS.purple };

  // Timeline: detections per hour (area)
  const now = new Date();
  const hours = Array.from({ length: 24 }, (_, i) => {
    const h = startOfHour(subHours(now, 23 - i));
    return { hour: format(h, "HH:mm"), timestamp: h.getTime(), detections: 0, alerts: 0 };
  });
  (detections ?? []).forEach((d) => {
    const t = startOfHour(new Date(d.created_at)).getTime();
    const slot = hours.find((h) => h.timestamp === t);
    if (slot) slot.detections++;
  });
  (alerts ?? []).forEach((a) => {
    const t = startOfHour(new Date(a.created_at)).getTime();
    const slot = hours.find((h) => h.timestamp === t);
    if (slot) slot.alerts++;
  });

  // Alert types distribution
  const alertTypeCounts = (alerts ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {});
  const alertTypeData = Object.entries(alertTypeCounts).map(([type, count]) => ({ type, count }));

  // Confidence distribution
  const confidenceBuckets = [
    { range: "60-70%", min: 0.6, max: 0.7, count: 0 },
    { range: "70-80%", min: 0.7, max: 0.8, count: 0 },
    { range: "80-90%", min: 0.8, max: 0.9, count: 0 },
    { range: "90-100%", min: 0.9, max: 1.0, count: 0 },
  ];
  (detections ?? []).forEach((d) => {
    const b = confidenceBuckets.find((b) => d.confidence >= b.min && d.confidence < b.max);
    if (b) b.count++;
    else if (d.confidence >= 1.0) confidenceBuckets[3].count++;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics Intelligence Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">AI detection metrics, threat analysis, and traffic intelligence</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Detections", value: detections?.length ?? 0, icon: Eye, color: "text-primary" },
            { label: "Total Alerts", value: alerts?.length ?? 0, icon: AlertTriangle, color: "text-sentinel-amber" },
            { label: "Unacknowledged", value: alerts?.filter((a) => !a.acknowledged).length ?? 0, icon: Activity, color: "text-sentinel-red" },
            { label: "Avg Confidence", value: detections?.length ? `${(((detections.reduce((s, d) => s + Number(d.confidence), 0)) / detections.length) * 100).toFixed(1)}%` : "—", icon: TrendingUp, color: "text-sentinel-green" },
          ].map((s) => (
            <div key={s.label} className="gradient-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold font-mono">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Timeline */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4">24h Activity Timeline</h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={hours}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }} />
                <Area type="monotone" dataKey="detections" stroke={CHART_COLORS.cyan} fill={CHART_COLORS.cyan} fillOpacity={0.15} strokeWidth={2} name="Detections" />
                <Area type="monotone" dataKey="alerts" stroke={CHART_COLORS.red} fill={CHART_COLORS.red} fillOpacity={0.15} strokeWidth={2} name="Alerts" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Detection by Object Type */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4">Detections by Object Type</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Alerts by Severity */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4">Alerts by Severity</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                <XAxis dataKey="severity" tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }} />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {severityData.map((entry) => (
                    <Cell key={entry.severity} fill={severityColors[entry.severity]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alert Types */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4">Alert Types Distribution</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={alertTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }} />
                <YAxis dataKey="type" type="category" tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }} width={80} />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }} />
                <Bar dataKey="count" fill={CHART_COLORS.cyan} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Confidence Distribution */}
          <div className="gradient-card border border-border rounded-lg p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">AI Confidence Distribution</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={confidenceBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }} />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }} />
                <Bar dataKey="count" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
