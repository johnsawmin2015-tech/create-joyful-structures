import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Check, CheckCheck, ShieldAlert } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const severityColor: Record<string, string> = {
  critical: "bg-sentinel-red text-destructive-foreground",
  high: "bg-sentinel-red/70 text-destructive-foreground",
  medium: "bg-sentinel-amber text-primary-foreground",
  low: "bg-sentinel-green text-primary-foreground",
};

const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function Alerts() {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  const { data: alerts } = useQuery({
    queryKey: ["all-alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alerts")
        .select("*, cameras(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("alerts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
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

  const bulkAcknowledge = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("alerts").update({ acknowledged: true }).eq("acknowledged", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-alerts"] });
      toast.success("All alerts acknowledged");
    },
  });

  const filtered = useMemo(() => {
    let list = alerts ?? [];
    if (statusFilter === "active") list = list.filter((a) => !a.acknowledged);
    if (statusFilter === "acknowledged") list = list.filter((a) => a.acknowledged);
    if (severityFilter !== "all") list = list.filter((a) => a.severity === severityFilter);
    return list.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [alerts, severityFilter, statusFilter]);

  const criticalActive = alerts?.filter((a) => a.severity === "critical" && !a.acknowledged) ?? [];
  const activeCount = alerts?.filter((a) => !a.acknowledged).length ?? 0;

  // Summary stats
  const stats = useMemo(() => {
    const all = alerts ?? [];
    return {
      total: all.length,
      active: all.filter((a) => !a.acknowledged).length,
      critical: all.filter((a) => a.severity === "critical" && !a.acknowledged).length,
      high: all.filter((a) => a.severity === "high" && !a.acknowledged).length,
    };
  }, [alerts]);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* P0 Critical Banner */}
        {criticalActive.length > 0 && (
          <div className="bg-sentinel-red/10 border border-sentinel-red/40 rounded-lg p-4 flex items-center gap-3 glow-red animate-pulse-glow">
            <ShieldAlert className="h-6 w-6 text-sentinel-red shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-sentinel-red">
                {criticalActive.length} CRITICAL ALERT{criticalActive.length > 1 ? "S" : ""} — Immediate Action Required
              </p>
              <p className="text-xs text-sentinel-red/80 truncate">
                {criticalActive[0].message}
              </p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => acknowledge.mutate(criticalActive[0].id)}
            >
              Acknowledge
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-sentinel-amber" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Incident Command Center</h1>
              <p className="text-muted-foreground text-sm">
                Real-time alert feed • {stats.active} active • {stats.critical} critical
              </p>
            </div>
          </div>
          {activeCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkAcknowledge.mutate()}
              disabled={bulkAcknowledge.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Ack All ({activeCount})
            </Button>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Alerts", value: stats.total, color: "text-foreground" },
            { label: "Active", value: stats.active, color: "text-primary" },
            { label: "Critical", value: stats.critical, color: "text-sentinel-red" },
            { label: "High", value: stats.high, color: "text-sentinel-amber" },
          ].map((s) => (
            <div key={s.label} className="gradient-card border border-border rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
              <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-card h-8">
              <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
              <TabsTrigger value="active" className="text-xs h-7">Active</TabsTrigger>
              <TabsTrigger value="acknowledged" className="text-xs h-7">Acknowledged</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={severityFilter} onValueChange={setSeverityFilter}>
            <TabsList className="bg-card h-8">
              <TabsTrigger value="all" className="text-xs h-7">All Severity</TabsTrigger>
              <TabsTrigger value="critical" className="text-xs h-7">Critical</TabsTrigger>
              <TabsTrigger value="high" className="text-xs h-7">High</TabsTrigger>
              <TabsTrigger value="medium" className="text-xs h-7">Medium</TabsTrigger>
              <TabsTrigger value="low" className="text-xs h-7">Low</TabsTrigger>
            </TabsList>
          </Tabs>
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Alert timeline */}
        <div className="space-y-2">
          {filtered.map((alert) => (
            <div
              key={alert.id}
              className={`gradient-card border rounded-lg p-4 flex items-start gap-4 transition-all ${
                alert.acknowledged
                  ? "border-border opacity-50"
                  : alert.severity === "critical"
                  ? "border-sentinel-red/40 glow-red"
                  : "border-glow"
              }`}
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center pt-1 shrink-0">
                <div
                  className={`h-3 w-3 rounded-full ${
                    alert.acknowledged
                      ? "bg-muted-foreground"
                      : alert.severity === "critical"
                      ? "bg-sentinel-red animate-pulse-glow"
                      : alert.severity === "high"
                      ? "bg-sentinel-amber"
                      : "bg-sentinel-green"
                  }`}
                />
                <div className="w-px h-full bg-border mt-1" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={severityColor[alert.severity]}>{alert.severity}</Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">{alert.type}</Badge>
                  {alert.acknowledged && <Badge variant="secondary" className="text-[10px]">✓ Acknowledged</Badge>}
                </div>
                <p className="text-sm">{alert.message}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {(alert as any).cameras?.name || "Unknown"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(alert.created_at), "MMM dd, HH:mm:ss")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {!alert.acknowledged && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => acknowledge.mutate(alert.id)}
                  className="shrink-0"
                  disabled={acknowledge.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Ack
                </Button>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No alerts matching current filters
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
