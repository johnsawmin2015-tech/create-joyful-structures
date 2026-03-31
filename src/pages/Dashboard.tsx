import { Camera, Bell, Eye, Activity, AlertTriangle, Shield } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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
      const { data } = await supabase.from("alerts").select("*, cameras(name)").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: detections } = useQuery({
    queryKey: ["detection-count"],
    queryFn: async () => {
      const { count } = await supabase.from("detections").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const onlineCameras = cameras?.filter((c) => c.status === "online").length ?? 0;
  const totalCameras = cameras?.length ?? 0;
  const unacknowledgedAlerts = alerts?.filter((a) => !a.acknowledged).length ?? 0;

  const severityColor: Record<string, string> = {
    critical: "bg-sentinel-red text-destructive-foreground",
    high: "bg-sentinel-red/70 text-destructive-foreground",
    medium: "bg-sentinel-amber text-primary-foreground",
    low: "bg-sentinel-green text-primary-foreground",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time monitoring dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Cameras Online" value={`${onlineCameras}/${totalCameras}`} icon={Camera} variant="cyan" trend="Real-time" />
          <StatCard title="Active Alerts" value={unacknowledgedAlerts} icon={Bell} variant="red" trend="Unacknowledged" />
          <StatCard title="Detections Today" value={detections ?? 0} icon={Eye} variant="amber" />
          <StatCard title="System Status" value="Operational" icon={Activity} variant="green" trend="P95 < 100ms" />
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

          {/* Camera Status */}
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
                      <div className={`h-2.5 w-2.5 rounded-full ${cam.status === "online" ? "bg-sentinel-green animate-pulse-glow" : cam.status === "error" ? "bg-sentinel-red" : "bg-muted-foreground"}`} />
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
