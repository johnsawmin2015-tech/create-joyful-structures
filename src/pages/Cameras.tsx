import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera, Plus, Trash2, Wifi, WifiOff, AlertTriangle,
  Signal, Thermometer, Activity,
} from "lucide-react";
import { toast } from "sonner";

// Simulated per-camera health metrics
function getCameraHealth(status: string) {
  if (status === "online") {
    return {
      bitrate: (2.5 + Math.random() * 3.5).toFixed(1),
      packetLoss: (Math.random() * 0.8).toFixed(2),
      signalStrength: 75 + Math.floor(Math.random() * 25),
      diskBuffer: Math.floor(10 + Math.random() * 40),
      temperature: 38 + Math.floor(Math.random() * 20),
      uptime: `${Math.floor(24 + Math.random() * 720)}h`,
    };
  }
  return { bitrate: "0", packetLoss: "—", signalStrength: 0, diskBuffer: 0, temperature: 0, uptime: "—" };
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Wifi }> = {
  online: { label: "Online", color: "bg-sentinel-green/20 text-sentinel-green", icon: Wifi },
  offline: { label: "Offline", color: "bg-muted text-muted-foreground", icon: WifiOff },
  error: { label: "Error", color: "bg-sentinel-red/20 text-sentinel-red", icon: AlertTriangle },
};

export default function Cameras() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    name: "", location: "", rtsp_url: "", resolution: "1080p", fps: 30,
  });

  const { data: cameras, isLoading } = useQuery({
    queryKey: ["cameras"],
    queryFn: async () => {
      const { data } = await supabase.from("cameras").select("*").order("created_at");
      return data ?? [];
    },
  });

  const addCamera = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cameras").insert([{ ...form, fps: Number(form.fps) }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cameras"] });
      toast.success("Camera added");
      setOpen(false);
      setForm({ name: "", location: "", rtsp_url: "", resolution: "1080p", fps: 30 });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCamera = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cameras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cameras"] });
      toast.success("Camera removed");
    },
  });

  const filtered = statusFilter === "all"
    ? cameras
    : cameras?.filter((c) => c.status === statusFilter);

  const onlineCount = cameras?.filter((c) => c.status === "online").length ?? 0;
  const totalCount = cameras?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Camera Management Console</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {onlineCount}/{totalCount} cameras online • Stream health monitoring
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Camera</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Add New Camera</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addCamera.mutate(); }} className="space-y-4">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-background" /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-background" /></div>
                <div><Label>RTSP URL</Label><Input value={form.rtsp_url} onChange={(e) => setForm({ ...form, rtsp_url: e.target.value })} placeholder="rtsp://192.168.1.x:554/stream" className="bg-background" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Resolution</Label>
                    <Select value={form.resolution} onValueChange={(v) => setForm({ ...form, resolution: v })}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720p">720p</SelectItem>
                        <SelectItem value="1080p">1080p</SelectItem>
                        <SelectItem value="4K">4K</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>FPS</Label><Input type="number" value={form.fps} onChange={(e) => setForm({ ...form, fps: Number(e.target.value) })} className="bg-background" /></div>
                </div>
                <Button type="submit" className="w-full" disabled={addCamera.isPending}>Add Camera</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Fleet summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Online", value: onlineCount, color: "text-sentinel-green" },
            { label: "Offline", value: cameras?.filter((c) => c.status === "offline").length ?? 0, color: "text-muted-foreground" },
            { label: "Error", value: cameras?.filter((c) => c.status === "error").length ?? 0, color: "text-sentinel-red" },
          ].map((s) => (
            <div key={s.label} className="gradient-card border border-border rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
              <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-card h-8">
            <TabsTrigger value="all" className="text-xs h-7">All ({totalCount})</TabsTrigger>
            <TabsTrigger value="online" className="text-xs h-7">Online</TabsTrigger>
            <TabsTrigger value="offline" className="text-xs h-7">Offline</TabsTrigger>
            <TabsTrigger value="error" className="text-xs h-7">Error</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Camera cards with health */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((cam) => {
            const health = getCameraHealth(cam.status);
            const st = statusConfig[cam.status] || statusConfig.offline;
            const StatusIcon = st.icon;
            return (
              <div key={cam.id} className="gradient-card border border-border rounded-lg p-5 hover:border-glow transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Camera className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{cam.name}</p>
                      <p className="text-xs text-muted-foreground">{cam.location || "No location"}</p>
                    </div>
                  </div>
                  <Badge className={`text-[10px] ${st.color}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {st.label}
                  </Badge>
                </div>

                {/* Stream config */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-background/50 rounded p-2 text-center">
                    <p className="text-[9px] text-muted-foreground">Resolution</p>
                    <p className="text-xs font-mono font-medium">{cam.resolution}</p>
                  </div>
                  <div className="bg-background/50 rounded p-2 text-center">
                    <p className="text-[9px] text-muted-foreground">FPS</p>
                    <p className="text-xs font-mono font-medium">{cam.fps}</p>
                  </div>
                  <div className="bg-background/50 rounded p-2 text-center">
                    <p className="text-[9px] text-muted-foreground">Uptime</p>
                    <p className="text-xs font-mono font-medium">{health.uptime}</p>
                  </div>
                </div>

                {/* Health metrics */}
                {cam.status === "online" && (
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Activity className="h-3 w-3" /> Bitrate
                      </span>
                      <span className="font-mono">{health.bitrate} Mbps</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Signal className="h-3 w-3" /> Signal
                      </span>
                      <span className="font-mono">{health.signalStrength}%</span>
                    </div>
                    <Progress value={health.signalStrength} className="h-1" />
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Thermometer className="h-3 w-3" /> Temp
                      </span>
                      <span className={`font-mono ${health.temperature > 50 ? "text-sentinel-amber" : ""}`}>
                        {health.temperature}°C
                      </span>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[60%]">
                    {cam.rtsp_url || "No stream URL"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCamera.mutate(cam.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          {!isLoading && (!filtered || filtered.length === 0) && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No cameras match filter
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
