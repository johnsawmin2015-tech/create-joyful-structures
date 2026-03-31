import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useEffect } from "react";

export default function Alerts() {
  const queryClient = useQueryClient();

  const { data: alerts } = useQuery({
    queryKey: ["all-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("alerts").select("*, cameras(name)").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("alerts-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["all-alerts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const acknowledge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alerts").update({ acknowledged: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-alerts"] });
      toast.success("Alert acknowledged");
    },
  });

  const severityColor: Record<string, string> = {
    critical: "bg-sentinel-red text-destructive-foreground",
    high: "bg-sentinel-red/70 text-destructive-foreground",
    medium: "bg-sentinel-amber text-primary-foreground",
    low: "bg-sentinel-green text-primary-foreground",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-sentinel-amber" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Alert Center</h1>
            <p className="text-muted-foreground text-sm">Real-time alert feed with auto-refresh</p>
          </div>
        </div>

        <div className="space-y-3">
          {alerts?.map((alert) => (
            <div key={alert.id} className={`gradient-card border rounded-lg p-4 flex items-start justify-between transition-all ${alert.acknowledged ? "border-border opacity-60" : "border-glow glow-cyan"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={severityColor[alert.severity]}>{alert.severity}</Badge>
                  <Badge variant="outline" className="font-mono text-xs">{alert.type}</Badge>
                  {alert.acknowledged && <Badge variant="secondary">Acknowledged</Badge>}
                </div>
                <p className="text-sm mt-1">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(alert as any).cameras?.name || "Unknown camera"} · {format(new Date(alert.created_at), "MMM dd, HH:mm:ss")}
                </p>
              </div>
              {!alert.acknowledged && (
                <Button size="sm" variant="outline" onClick={() => acknowledge.mutate(alert.id)} className="ml-4 shrink-0">
                  <Check className="h-4 w-4 mr-1" />Ack
                </Button>
              )}
            </div>
          ))}
          {(!alerts || alerts.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">No alerts in the system</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
