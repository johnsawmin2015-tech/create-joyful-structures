import { useMemo } from "react";
import { Camera, Bell, Eye, Activity, AlertTriangle, Shield, Zap, TrendingUp } from "lucide-react";
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
  background: "hsl(220, 18%, 10%)",
  border: "1px solid hsl(220, 14%, 18%)",
  borderRadius: 8,
  color: "hsl(210, 20%, 92%)",
};

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
        .limit(10);
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

  // Mini sparkline data from detections
  const sparkline = useMemo(() => {
    const hours = Array.from({ length: 12 }, (_, i) => ({ h: i, count: 0 }));
    (detections ?? []).forEach((d) => {
      const h = new Date(d.created_at).getHours() % 12;
      hours[h].count++;
    });
    return hours;
  }, [detections]);

  const severityColor: Record<string, string> = {
    critical: "bg-sentinel-red text-destructive-foreground",
    high: "bg-sentinel-red/70 text-destructive-foreground",
    medium: "bg-sentinel-amber text-primary-foreground",
    low: "bg-sentinel-green text-primary-foreground",
  };

  // Threat level based on active critical alerts
  const threatLevel = criticalAlerts > 0 ? "ELEVATED" : unacknowledgedAlerts > 3 ? "GUARDED" : "NORMAL";
  const threatColor = criticalAlerts > 0 ? "text-sentinel-red" : unacknowledgedAlerts > 3 ? "text-sentinel-amber" : "text-sentinel-green";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Threat level banner */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
            <p className="text-muted-foreground text-sm mt-1">Real-time monitoring dashboard</p>
          </div>
          <div className="flex items-center gap-2 gradient-card border border-border rounded-lg px-4 py-2">
            <Shield className={`h-5 w-5 ${threatColor}`} />
            <div>
              <p className="text-[9px] text-muted-foreground uppercase">Threat Level</p>
              <p className={`text-sm font-bold font-mono ${threatColor}`}>{threatLevel}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Cameras Online" value={`${onlineCameras}/${totalCameras}`} icon={Camera} variant="cyan" trend="Real-time" />
          <StatCard title="Active Alerts" value={unacknowledgedAlerts} icon={Bell} variant="red" trend={`${criticalAlerts} critical`} />
          <StatCard title="Detections" value={detections?.length ?? 0} icon={Eye} variant="amber" trend="Total recorded" />
          <StatCard title="System Status" value="Operational" icon={Activity} variant="green" trend="P95 < 100ms" />
        </div>

        {/* Detection sparkline + System health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Detection Activity</h2>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={sparkline}>
                <XAxis dataKey="h" tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(185, 70%, 50%)"
                  fill="hsl(185, 70%, 50%)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Infrastructure mini-status */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-sentinel-amber" />
              <h2 className="text-lg font-semibold">Infrastructure</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "GPU Cluster", value: 67, status: "healthy" },
                { label: "Storage", value: 56, status: "healthy" },
                { label: "Network", value: 92, status: "healthy" },
                { label: "API Gateway", value: 15, status: "healthy" },
              ].map((r) => (
                <div key={r.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-mono">{r.value}%</span>
                  </div>
                  <Progress value={r.value} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Alerts */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-sentinel-amber" />
              <h2 className="text-lg font-semibold">Recent Alerts</h2>
            </div>
            {alerts && alerts.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-auto">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between p-3 rounded-md bg-background/50 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={severityColor[alert.severity]}>{alert.severity}</Badge>
                        <span className="text-xs font-mono text-muted-foreground">{alert.type}</span>
                      </div>
                      <p className="text-sm truncate">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(alert as any).cameras?.name} · {format(new Date(alert.created_at), "HH:mm:ss")}
                      </p>
                    </div>
                    {!alert.acknowledged && (
                      <div className="h-2 w-2 rounded-full bg-sentinel-red animate-pulse-glow mt-2 ml-2 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">No alerts recorded</p>
            )}
          </div>

          {/* Camera Fleet */}
          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Camera Fleet</h2>
            </div>
            {cameras && cameras.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-auto">
                {cameras.map((cam) => (
                  <div key={cam.id} className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ${
                        cam.status === "online" ? "bg-sentinel-green animate-pulse-glow"
                        : cam.status === "error" ? "bg-sentinel-red" : "bg-muted-foreground"
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{cam.name}</p>
                        <p className="text-xs text-muted-foreground">{cam.location}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{cam.resolution} · {cam.fps}fps</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">No cameras configured</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
