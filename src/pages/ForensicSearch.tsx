import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Clock, Camera, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

export default function ForensicSearch() {
  const [objectFilter, setObjectFilter] = useState<string>("all");
  const [cameraFilter, setCameraFilter] = useState<string>("all");
  const [minConfidence, setMinConfidence] = useState<string>("0");
  const [searchPlate, setSearchPlate] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  const { data: cameras } = useQuery({
    queryKey: ["cameras"],
    queryFn: async () => {
      const { data } = await supabase.from("cameras").select("*");
      return data ?? [];
    },
  });

  const { data: detections, isLoading } = useQuery({
    queryKey: ["forensic-detections", objectFilter, cameraFilter, minConfidence],
    queryFn: async () => {
      let q = supabase.from("detections").select("*, cameras(name, location)").order("created_at", { ascending: false }).limit(200);
      if (objectFilter !== "all") q = q.eq("object_type", objectFilter);
      if (cameraFilter !== "all") q = q.eq("camera_id", cameraFilter);
      if (Number(minConfidence) > 0) q = q.gte("confidence", Number(minConfidence) / 100);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["forensic-alerts", cameraFilter],
    queryFn: async () => {
      let q = supabase.from("alerts").select("*, cameras(name)").order("created_at", { ascending: false }).limit(100);
      if (cameraFilter !== "all") q = q.eq("camera_id", cameraFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const objectTypes = ["person", "vehicle", "license_plate", "bag", "animal"];

  const filteredDetections = searchPlate
    ? detections?.filter((d) => d.object_type === "license_plate")
    : detections;

  const objectTypeColors: Record<string, string> = {
    person: "bg-primary/20 text-primary",
    vehicle: "bg-sentinel-amber/20 text-sentinel-amber",
    license_plate: "bg-yellow-500/20 text-yellow-400",
    bag: "bg-purple-500/20 text-purple-400",
    animal: "bg-sentinel-green/20 text-sentinel-green",
  };

  const severityColors: Record<string, string> = {
    critical: "bg-sentinel-red text-destructive-foreground",
    high: "bg-sentinel-red/70 text-destructive-foreground",
    medium: "bg-sentinel-amber text-primary-foreground",
    low: "bg-sentinel-green text-primary-foreground",
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forensic Search Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">Search recorded detections, alerts, and evidence by multiple criteria</p>
        </div>

        {/* Filters */}
        <div className="gradient-card border border-border rounded-lg p-4">
          <button
            className="flex items-center gap-2 text-sm font-medium w-full"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 text-primary" />
            Search Filters
            {showFilters ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </button>
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div>
                <Label className="text-xs text-muted-foreground">Object Type</Label>
                <Select value={objectFilter} onValueChange={setObjectFilter}>
                  <SelectTrigger className="bg-background mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {objectTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Camera</Label>
                <Select value={cameraFilter} onValueChange={setCameraFilter}>
                  <SelectTrigger className="bg-background mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cameras</SelectItem>
                    {cameras?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Min Confidence (%)</Label>
                <Input type="number" min={0} max={100} value={minConfidence} onChange={(e) => setMinConfidence(e.target.value)} className="bg-background mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">License Plate</Label>
                <Input placeholder="Search plate..." value={searchPlate} onChange={(e) => setSearchPlate(e.target.value)} className="bg-background mt-1 h-9 text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Detections list */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Detections</h2>
              <Badge variant="secondary" className="text-xs font-mono">{filteredDetections?.length ?? 0} results</Badge>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-auto pr-1">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground font-mono text-sm animate-pulse">Searching...</div>
              ) : filteredDetections?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No detections match criteria</div>
              ) : (
                filteredDetections?.map((d) => {
                  const bbox = d.bounding_box as any;
                  return (
                    <div key={d.id} className="flex items-center gap-3 p-3 bg-background/50 border border-border/50 rounded-md hover:border-glow transition-colors">
                      {/* Mini bounding box visualization */}
                      <div className="relative h-12 w-16 bg-card rounded border border-border flex-shrink-0 overflow-hidden">
                        {bbox && (
                          <div
                            className="absolute border border-primary/60"
                            style={{
                              left: `${(bbox.x / 800) * 100}%`,
                              top: `${(bbox.y / 600) * 100}%`,
                              width: `${(bbox.w / 800) * 100}%`,
                              height: `${(bbox.h / 600) * 100}%`,
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] ${objectTypeColors[d.object_type] || "bg-muted text-muted-foreground"}`}>
                            {d.object_type}
                          </Badge>
                          <span className="text-xs font-mono text-primary">{(Number(d.confidence) * 100).toFixed(1)}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {(d as any).cameras?.name ?? "Unknown"} · {format(new Date(d.created_at), "MMM d, HH:mm:ss")}
                        </p>
                      </div>
                      {bbox && (
                        <span className="text-[9px] font-mono text-muted-foreground hidden md:block">
                          [{bbox.x},{bbox.y}] {bbox.w}×{bbox.h}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Related alerts */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-sentinel-amber" />
              <h2 className="font-semibold">Related Alerts</h2>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-auto pr-1">
              {alerts?.map((a) => (
                <div key={a.id} className="p-3 bg-background/50 border border-border/50 rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`text-[10px] ${severityColors[a.severity]}`}>{a.severity}</Badge>
                    <span className="text-[10px] font-mono text-muted-foreground">{a.type}</span>
                  </div>
                  <p className="text-xs truncate">{a.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {(a as any).cameras?.name} · {format(new Date(a.created_at), "MMM d, HH:mm")}
                  </p>
                </div>
              ))}
              {(!alerts || alerts.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No alerts</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
