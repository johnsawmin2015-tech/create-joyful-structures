import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid2x2, Grid3x3, Maximize2, Minimize2, Camera, Wifi, WifiOff } from "lucide-react";

type GridLayout = "1" | "4" | "9" | "16";

interface BBox {
  x: number; y: number; w: number; h: number;
  label: string; confidence: number; color: string;
}

const OBJECT_COLORS: Record<string, string> = {
  person: "#00D4FF",
  vehicle: "#FF6B00",
  license_plate: "#FFD600",
  bag: "#A855F7",
  animal: "#22C55E",
};

function SimulatedFeed({ camera, isFullscreen, onToggleFullscreen }: {
  camera: any;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const [boxes, setBoxes] = useState<BBox[]>([]);
  const [time, setTime] = useState(new Date());

  // Simulate moving bounding boxes
  useEffect(() => {
    if (camera.status !== "online") return;
    const interval = setInterval(() => {
      setTime(new Date());
      const numBoxes = Math.floor(Math.random() * 3) + 1;
      const newBoxes: BBox[] = [];
      const objects = ["person", "vehicle", "person", "person", "bag"];
      for (let i = 0; i < numBoxes; i++) {
        const obj = objects[Math.floor(Math.random() * objects.length)];
        newBoxes.push({
          x: 10 + Math.random() * 60,
          y: 10 + Math.random() * 40,
          w: obj === "vehicle" ? 20 + Math.random() * 15 : 8 + Math.random() * 8,
          h: obj === "vehicle" ? 12 + Math.random() * 8 : 18 + Math.random() * 12,
          label: obj,
          confidence: 0.7 + Math.random() * 0.28,
          color: OBJECT_COLORS[obj] || "#00D4FF",
        });
      }
      setBoxes(newBoxes);
    }, 2000);
    return () => clearInterval(interval);
  }, [camera.status]);

  const isOnline = camera.status === "online";

  return (
    <div className={`relative bg-background border border-border rounded-lg overflow-hidden group ${isFullscreen ? "fixed inset-4 z-50" : "aspect-video"}`}>
      {/* Simulated video feed background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background">
        {isOnline ? (
          <>
            {/* Scan line animation */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-full h-px bg-primary/20 animate-scan-line" />
            </div>
            {/* Grid overlay */}
            <svg className="absolute inset-0 w-full h-full opacity-10">
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={`${(i + 1) * 12.5}%`} x2="100%" y2={`${(i + 1) * 12.5}%`} stroke="hsl(185, 70%, 50%)" strokeWidth="0.5" />
              ))}
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={`v${i}`} x1={`${(i + 1) * 12.5}%`} y1="0" x2={`${(i + 1) * 12.5}%`} y2="100%" stroke="hsl(185, 70%, 50%)" strokeWidth="0.5" />
              ))}
            </svg>
            {/* AI bounding boxes */}
            {boxes.map((box, i) => (
              <div
                key={i}
                className="absolute border-2 transition-all duration-500"
                style={{
                  left: `${box.x}%`, top: `${box.y}%`,
                  width: `${box.w}%`, height: `${box.h}%`,
                  borderColor: box.color,
                  boxShadow: `0 0 8px ${box.color}40`,
                }}
              >
                <span
                  className="absolute -top-5 left-0 text-[9px] font-mono px-1 rounded"
                  style={{ backgroundColor: box.color, color: "#050A0F" }}
                >
                  {box.label} {(box.confidence * 100).toFixed(0)}%
                </span>
                {/* Corner markers */}
                <div className="absolute -top-px -left-px w-2 h-2 border-t-2 border-l-2" style={{ borderColor: box.color }} />
                <div className="absolute -top-px -right-px w-2 h-2 border-t-2 border-r-2" style={{ borderColor: box.color }} />
                <div className="absolute -bottom-px -left-px w-2 h-2 border-b-2 border-l-2" style={{ borderColor: box.color }} />
                <div className="absolute -bottom-px -right-px w-2 h-2 border-b-2 border-r-2" style={{ borderColor: box.color }} />
              </div>
            ))}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <WifiOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-mono">
                {camera.status === "error" ? "SIGNAL LOST" : "OFFLINE"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* HUD overlay */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none">
        <div>
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${isOnline ? "bg-sentinel-green animate-pulse" : camera.status === "error" ? "bg-sentinel-red" : "bg-muted-foreground"}`} />
            <span className="text-[10px] font-mono text-foreground/80">{camera.name}</span>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">{camera.location}</span>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-primary">{camera.resolution} · {camera.fps}fps</span>
          <p className="text-[9px] font-mono text-muted-foreground">{time.toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Controls (on hover) */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
        <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/60 backdrop-blur-sm" onClick={onToggleFullscreen}>
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Detection counter */}
      {isOnline && boxes.length > 0 && (
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="text-[9px] font-mono bg-background/60 backdrop-blur-sm">
            {boxes.length} object{boxes.length > 1 ? "s" : ""} detected
          </Badge>
        </div>
      )}
    </div>
  );
}

export default function LiveMonitor() {
  const [layout, setLayout] = useState<GridLayout>("4");
  const [fullscreenCam, setFullscreenCam] = useState<string | null>(null);

  const { data: cameras } = useQuery({
    queryKey: ["cameras"],
    queryFn: async () => {
      const { data } = await supabase.from("cameras").select("*").order("created_at");
      return data ?? [];
    },
  });

  const gridCols: Record<GridLayout, string> = {
    "1": "grid-cols-1",
    "4": "grid-cols-1 md:grid-cols-2",
    "9": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    "16": "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  };

  const displayCameras = cameras?.slice(0, Number(layout)) ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Live Monitor</h1>
            <p className="text-muted-foreground text-sm mt-1">Real-time AI-enhanced surveillance feeds</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Layout:</span>
            <Select value={layout} onValueChange={(v) => setLayout(v as GridLayout)}>
              <SelectTrigger className="w-24 bg-background h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1×1</SelectItem>
                <SelectItem value="4">2×2</SelectItem>
                <SelectItem value="9">3×3</SelectItem>
                <SelectItem value="16">4×4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fullscreen overlay backdrop */}
        {fullscreenCam && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setFullscreenCam(null)} />
        )}

        <div className={`grid ${gridCols[layout]} gap-3`}>
          {displayCameras.map((cam) => (
            <SimulatedFeed
              key={cam.id}
              camera={cam}
              isFullscreen={fullscreenCam === cam.id}
              onToggleFullscreen={() => setFullscreenCam(fullscreenCam === cam.id ? null : cam.id)}
            />
          ))}
          {displayCameras.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <Camera className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No cameras configured</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
