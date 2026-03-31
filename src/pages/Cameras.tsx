import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Cameras() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", rtsp_url: "", resolution: "1080p", fps: 30 });

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Camera Management</h1>
            <p className="text-muted-foreground text-sm mt-1">Configure and monitor CCTV feeds</p>
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
                <div><Label>RTSP URL</Label><Input value={form.rtsp_url} onChange={(e) => setForm({ ...form, rtsp_url: e.target.value })} placeholder="rtsp://" className="bg-background" /></div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras?.map((cam) => (
            <div key={cam.id} className="gradient-card border border-border rounded-lg p-5 hover:border-glow transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Camera className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">{cam.name}</p>
                    <p className="text-xs text-muted-foreground">{cam.location || "No location"}</p>
                  </div>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${cam.status === "online" ? "bg-sentinel-green animate-pulse-glow" : cam.status === "error" ? "bg-sentinel-red" : "bg-muted-foreground"}`} />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">{cam.resolution} · {cam.fps}fps</span>
                <Button variant="ghost" size="icon" onClick={() => deleteCamera.mutate(cam.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {!isLoading && (!cameras || cameras.length === 0) && (
            <div className="col-span-full text-center py-12 text-muted-foreground">No cameras configured yet</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
