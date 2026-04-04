import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Grid2x2, Grid3x3, Maximize2, Minimize2, Camera, Wifi, WifiOff, Eye, Moon, Sun, Search, Signal, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Volume2 } from "lucide-react";

type GridLayout = "1" | "4" | "9" | "16";

interface BBox {
  x: number; y: number; w: number; h: number;
  label: string; confidence: number; color: string;
  // for interpolation
  tx: number; ty: number;
}

const OBJECT_COLORS: Record<string, string> = {
  person: "#00D4FF",
  vehicle: "#FF6B00",
  license_plate: "#FFD600",
  bag: "#A855F7",
  animal: "#22C55E",
};

const DEMO_CAMERAS = [
  { id: "demo-01", name: "CAM-01", location: "Main Entrance", status: "online", resolution: "4K", fps: 30, rtsp_url: null },
  { id: "demo-02", name: "CAM-02", location: "Parking Lot A", status: "online", resolution: "1080p", fps: 30, rtsp_url: null },
  { id: "demo-03", name: "CAM-03", location: "Loading Dock", status: "online", resolution: "1080p", fps: 25, rtsp_url: null },
  { id: "demo-04", name: "CAM-04", location: "Lobby", status: "online", resolution: "4K", fps: 30, rtsp_url: null },
  { id: "demo-05", name: "CAM-05", location: "Corridor East", status: "online", resolution: "1080p", fps: 30, rtsp_url: null },
  { id: "demo-06", name: "CAM-06", location: "Perimeter North", status: "online", resolution: "1080p", fps: 25, rtsp_url: null },
  { id: "demo-07", name: "CAM-07", location: "Server Room", status: "online", resolution: "720p", fps: 15, rtsp_url: null },
  { id: "demo-08", name: "CAM-08", location: "Rooftop", status: "online", resolution: "1080p", fps: 30, rtsp_url: null },
  { id: "demo-09", name: "CAM-09", location: "Stairwell B", status: "offline", resolution: "1080p", fps: 30, rtsp_url: null },
  { id: "demo-10", name: "CAM-10", location: "Emergency Exit", status: "error", resolution: "1080p", fps: 30, rtsp_url: null },
  { id: "demo-11", name: "CAM-11", location: "Warehouse", status: "online", resolution: "720p", fps: 25, rtsp_url: null },
  { id: "demo-12", name: "CAM-12", location: "Reception", status: "online", resolution: "4K", fps: 30, rtsp_url: null },
];

// Tripwire zone definitions per camera
const ZONE_OVERLAYS: Record<string, { lines: { x1: number; y1: number; x2: number; y2: number; color: string }[]; zones: { points: string; color: string; label: string }[] }> = {
  "demo-01": {
    lines: [{ x1: 10, y1: 70, x2: 90, y2: 70, color: "#FF6B00" }],
    zones: [{ points: "60,20 95,20 95,60 60,60", color: "#FF000030", label: "Restricted" }],
  },
  "demo-04": {
    lines: [{ x1: 50, y1: 10, x2: 50, y2: 90, color: "#FFD600" }],
    zones: [{ points: "5,5 40,5 40,45 5,45", color: "#FF660030", label: "VIP Area" }],
  },
};

// Audio level meter
function AudioMeter() {
  const [levels, setLevels] = useState([0.2, 0.4, 0.6, 0.3]);
  useEffect(() => {
    const i = setInterval(() => {
      setLevels(Array.from({ length: 4 }, () => 0.1 + Math.random() * 0.8));
    }, 300);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="flex items-end gap-px h-4">
      {levels.map((l, i) => (
        <div key={i} className="w-1 bg-sentinel-green rounded-t transition-all duration-200" style={{ height: `${l * 100}%` }} />
      ))}
    </div>
  );
}

// Signal strength bars
function SignalBars({ strength }: { strength: number }) {
  return (
    <div className="flex items-end gap-px h-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`w-1 rounded-t ${i <= strength ? "bg-sentinel-green" : "bg-muted"}`} style={{ height: `${i * 25}%` }} />
      ))}
    </div>
  );
}

function SimulatedFeed({ camera, isFullscreen, onToggleFullscreen }: {
  camera: any;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const [boxes, setBoxes] = useState<BBox[]>([]);
  const [trails, setTrails] = useState<BBox[][]>([]);
  const [time, setTime] = useState(new Date());
  const [nightVision, setNightVision] = useState(false);
  const [showZones, setShowZones] = useState(false);
  const [showPTZ, setShowPTZ] = useState(false);
  const [flash, setFlash] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const isOnline = camera.status === "online";

  // Recording timer
  useEffect(() => {
    if (!isOnline) return;
    const i = setInterval(() => setRecTime((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [isOnline]);

  // Simulate bounding boxes with interpolation
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      setTime(new Date());
      setBoxes((prev) => {
        setTrails((t) => [prev, ...t].slice(0, 3));
        const numBoxes = Math.floor(Math.random() * 3) + 1;
        const newBoxes: BBox[] = [];
        const objects = ["person", "vehicle", "person", "person", "bag"];
        for (let i = 0; i < numBoxes; i++) {
          const obj = objects[Math.floor(Math.random() * objects.length)];
          const existing = prev[i];
          const tx = 10 + Math.random() * 60;
          const ty = 10 + Math.random() * 40;
          newBoxes.push({
            x: existing ? existing.x + (tx - existing.x) * 0.3 : tx,
            y: existing ? existing.y + (ty - existing.y) * 0.3 : ty,
            w: obj === "vehicle" ? 20 + Math.random() * 15 : 8 + Math.random() * 8,
            h: obj === "vehicle" ? 12 + Math.random() * 8 : 18 + Math.random() * 12,
            label: obj,
            confidence: 0.7 + Math.random() * 0.28,
            color: OBJECT_COLORS[obj] || "#00D4FF",
            tx, ty,
          });
        }
        // Add event log entry
        if (Math.random() > 0.6) {
          const obj = newBoxes[0];
          setEventLog((l) => [`${obj.label} ${(obj.confidence * 100).toFixed(0)}%`, ...l].slice(0, 3));
        }
        return newBoxes;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const handleSnapshot = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
  };

  const zones = ZONE_OVERLAYS[camera.id];
  const recStr = `${Math.floor(recTime / 60).toString().padStart(2, "0")}:${(recTime % 60).toString().padStart(2, "0")}`;

  return (
    <div
      className={`relative bg-background border border-border rounded-lg overflow-hidden group ${isFullscreen ? "fixed inset-4 z-50" : "aspect-video"}`}
      style={nightVision ? { filter: "hue-rotate(80deg) saturate(3) brightness(0.7)" } : undefined}
    >
      {/* Flash overlay */}
      {flash && <div className="absolute inset-0 bg-white/80 z-30 animate-scale-in" />}

      {/* Video feed background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background">
        {isOnline ? (
          <>
            {/* Scan line */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-full h-px bg-primary/20 animate-scan-line" />
            </div>
            {/* Grid overlay */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={`${(i + 1) * 12.5}%`} x2="100%" y2={`${(i + 1) * 12.5}%`} stroke="hsl(var(--primary))" strokeWidth="0.5" />
              ))}
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={`v${i}`} x1={`${(i + 1) * 12.5}%`} y1="0" x2={`${(i + 1) * 12.5}%`} y2="100%" stroke="hsl(var(--primary))" strokeWidth="0.5" />
              ))}
            </svg>

            {/* Zone overlays */}
            {showZones && zones && (
              <svg className="absolute inset-0 w-full h-full">
                {zones.lines.map((l, i) => (
                  <line key={`l${i}`} x1={`${l.x1}%`} y1={`${l.y1}%`} x2={`${l.x2}%`} y2={`${l.y2}%`} stroke={l.color} strokeWidth="2" strokeDasharray="6 3">
                    <animate attributeName="stroke-dashoffset" values="0;18" dur="1s" repeatCount="indefinite" />
                  </line>
                ))}
                {zones.zones.map((z, i) => (
                  <g key={`z${i}`}>
                    <polygon points={z.points.split(" ").map(p => { const [x, y] = p.split(","); return `${x}% ${y}%`; }).join(" ")} fill={z.color} stroke={z.color.replace("30", "80")} strokeWidth="1" />
                    <text x={`${parseInt(z.points.split(",")[0]) + 2}%`} y={`${parseInt(z.points.split(",")[1]) + 6}%`} fill="white" fontSize="8" fontFamily="monospace">{z.label}</text>
                  </g>
                ))}
              </svg>
            )}

            {/* Motion trails */}
            {trails.map((trailFrame, fi) =>
              trailFrame.map((box, bi) => (
                <div
                  key={`trail-${fi}-${bi}`}
                  className="absolute border transition-all duration-500 pointer-events-none"
                  style={{
                    left: `${box.x}%`, top: `${box.y}%`,
                    width: `${box.w}%`, height: `${box.h}%`,
                    borderColor: `${box.color}${fi === 0 ? "60" : fi === 1 ? "30" : "15"}`,
                    opacity: 1 - fi * 0.3,
                  }}
                />
              ))
            )}

            {/* AI bounding boxes */}
            {boxes.map((box, i) => (
              <div
                key={i}
                className="absolute border-2 transition-all duration-700 ease-out"
                style={{
                  left: `${box.x}%`, top: `${box.y}%`,
                  width: `${box.w}%`, height: `${box.h}%`,
                  borderColor: box.color,
                  boxShadow: `0 0 10px ${box.color}50`,
                }}
              >
                <span className="absolute -top-5 left-0 text-[8px] font-mono px-1 rounded" style={{ backgroundColor: box.color, color: "#050A0F" }}>
                  {box.label} {(box.confidence * 100).toFixed(0)}%
                </span>
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

      {/* HUD overlay top */}
      <div className="absolute top-1.5 left-2 right-2 flex items-start justify-between pointer-events-none z-10">
        <div>
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${isOnline ? "bg-sentinel-green animate-pulse" : camera.status === "error" ? "bg-sentinel-red animate-flicker" : "bg-muted-foreground"}`} />
            <span className="text-[10px] font-mono text-foreground/80">{camera.name}</span>
            <SignalBars strength={isOnline ? (camera.status === "error" ? 1 : 4) : 0} />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">{camera.location}</span>
        </div>
        <div className="text-right flex items-center gap-2">
          {isOnline && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-sentinel-red animate-pulse" />
              <span className="text-[9px] font-mono text-sentinel-red">REC {recStr}</span>
            </div>
          )}
          <div>
            <span className="text-[9px] font-mono text-primary">{camera.resolution} · {camera.fps}fps</span>
            <p className="text-[9px] font-mono text-muted-foreground">{time.toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Event ticker bottom */}
      {isOnline && eventLog.length > 0 && (
        <div className="absolute bottom-8 left-2 right-2 z-10 pointer-events-none">
          <div className="text-[8px] font-mono text-primary/70 truncate">
            {eventLog[0] && `▸ ${eventLog[0]}`}
          </div>
        </div>
      )}

      {/* Controls (on hover) */}
      <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="flex items-center gap-1">
          {isOnline && boxes.length > 0 && (
            <Badge variant="secondary" className="text-[8px] font-mono bg-background/60 backdrop-blur-sm h-5">
              {boxes.length} detected
            </Badge>
          )}
          {isOnline && <AudioMeter />}
        </div>
        <div className="flex items-center gap-0.5">
          {zones && (
            <Button variant="ghost" size="icon" className="h-6 w-6 bg-background/60 backdrop-blur-sm" onClick={() => setShowZones(!showZones)}>
              <Eye className={`h-3 w-3 ${showZones ? "text-sentinel-amber" : ""}`} />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 bg-background/60 backdrop-blur-sm" onClick={() => setNightVision(!nightVision)}>
            {nightVision ? <Sun className="h-3 w-3 text-sentinel-green" /> : <Moon className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 bg-background/60 backdrop-blur-sm" onClick={handleSnapshot}>
            <Camera className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 bg-background/60 backdrop-blur-sm" onClick={() => setShowPTZ(!showPTZ)}>
            <Signal className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 bg-background/60 backdrop-blur-sm" onClick={onToggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* PTZ controls overlay */}
      {showPTZ && isOnline && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="relative w-20 h-20 pointer-events-auto">
            <Button variant="ghost" size="icon" className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-6 bg-background/70 backdrop-blur-sm" onClick={() => {}}>
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="absolute bottom-0 left-1/2 -translate-x-1/2 h-6 w-6 bg-background/70 backdrop-blur-sm" onClick={() => {}}>
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-6 bg-background/70 backdrop-blur-sm" onClick={() => {}}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 bg-background/70 backdrop-blur-sm" onClick={() => {}}>
              <ChevronRight className="h-3 w-3" />
            </Button>
            <div className="absolute bottom-[-28px] left-1/2 -translate-x-1/2 flex gap-1">
              <Button variant="ghost" size="icon" className="h-5 w-5 bg-background/70 backdrop-blur-sm" onClick={() => {}}>
                <ZoomIn className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 bg-background/70 backdrop-blur-sm" onClick={() => {}}>
                <ZoomOut className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveMonitor() {
  const [layout, setLayout] = useState<GridLayout>("4");
  const [fullscreenCam, setFullscreenCam] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  const { data: dbCameras } = useQuery({
    queryKey: ["cameras"],
    queryFn: async () => {
      const { data } = await supabase.from("cameras").select("*").order("created_at");
      return data ?? [];
    },
  });

  // Merge DB cameras with demo cameras (DB takes priority)
  const allCameras = useMemo(() => {
    const dbNames = new Set((dbCameras ?? []).map((c) => c.name));
    const demos = DEMO_CAMERAS.filter((d) => !dbNames.has(d.name));
    return [...(dbCameras ?? []), ...demos];
  }, [dbCameras]);

  // Filter
  const filteredCameras = useMemo(() => {
    let result = allCameras;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q) || (c.location ?? "").toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      result = result.filter((c) => statusFilter === "online" ? c.status === "online" : c.status !== "online");
    }
    return result;
  }, [allCameras, searchQuery, statusFilter]);

  const displayCameras = filteredCameras.slice(0, Number(layout));
  const onlineCount = allCameras.filter((c) => c.status === "online").length;

  const gridCols: Record<GridLayout, string> = {
    "1": "grid-cols-1",
    "4": "grid-cols-1 md:grid-cols-2",
    "9": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    "16": "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Live Monitor</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Real-time AI-enhanced surveillance ·{" "}
              <span className="text-primary font-mono">{onlineCount}</span>/{allCameras.length} online
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search cameras..."
                className="h-8 w-40 pl-7 text-xs bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-24 bg-background h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
            <Select value={layout} onValueChange={(v) => setLayout(v as GridLayout)}>
              <SelectTrigger className="w-20 bg-background h-8 text-xs">
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
              <p>No cameras match your filters</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
