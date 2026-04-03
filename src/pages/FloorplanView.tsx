import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Eye, EyeOff, Flame, Map, Layers, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Simulated building layout
const BUILDING = {
  width: 800,
  height: 500,
  rooms: [
    { id: "lobby", label: "Main Lobby", x: 50, y: 50, w: 200, h: 150 },
    { id: "corridor", label: "Corridor A", x: 250, y: 50, w: 300, h: 60 },
    { id: "server", label: "Server Room", x: 250, y: 110, w: 140, h: 140 },
    { id: "office1", label: "Office East", x: 390, y: 110, w: 160, h: 140 },
    { id: "conference", label: "Conference", x: 550, y: 50, w: 200, h: 200 },
    { id: "parking", label: "Parking Garage", x: 50, y: 300, w: 350, h: 160 },
    { id: "storage", label: "Storage", x: 400, y: 300, w: 150, h: 160 },
    { id: "entrance", label: "Main Entrance", x: 550, y: 300, w: 200, h: 160 },
  ],
};

// Simulated camera positions mapped to building
const CAMERA_POSITIONS = [
  { idx: 0, x: 150, y: 120, angle: 45, fov: 70, room: "lobby" },
  { idx: 1, x: 400, y: 75, angle: 0, fov: 90, room: "corridor" },
  { idx: 2, x: 310, y: 180, angle: 180, fov: 60, room: "server" },
  { idx: 3, x: 470, y: 170, angle: 90, fov: 80, room: "office1" },
  { idx: 4, x: 650, y: 140, angle: 270, fov: 70, room: "conference" },
  { idx: 5, x: 200, y: 380, angle: 90, fov: 100, room: "parking" },
  { idx: 6, x: 475, y: 380, angle: 0, fov: 60, room: "storage" },
  { idx: 7, x: 650, y: 380, angle: 180, fov: 80, room: "entrance" },
];

// Simulated sensors
const SENSORS = [
  { id: "s1", type: "motion", x: 130, y: 80, status: "active" },
  { id: "s2", type: "door", x: 50, y: 125, status: "closed" },
  { id: "s3", type: "motion", x: 550, y: 80, status: "triggered" },
  { id: "s4", type: "temperature", x: 300, y: 140, status: "normal" },
  { id: "s5", type: "door", x: 550, y: 300, status: "open" },
  { id: "s6", type: "motion", x: 150, y: 350, status: "active" },
  { id: "s7", type: "glass-break", x: 700, y: 350, status: "active" },
  { id: "s8", type: "motion", x: 470, y: 320, status: "active" },
];

// Generate heatmap grid
const HEATMAP_CELLS = (() => {
  const cells: { x: number; y: number; intensity: number }[] = [];
  const cellSize = 40;
  for (let x = 50; x < 750; x += cellSize) {
    for (let y = 50; y < 460; y += cellSize) {
      // Higher intensity near entrance and parking
      const distEntrance = Math.sqrt((x - 650) ** 2 + (y - 380) ** 2);
      const distParking = Math.sqrt((x - 200) ** 2 + (y - 380) ** 2);
      const distLobby = Math.sqrt((x - 150) ** 2 + (y - 120) ** 2);
      const base = Math.random() * 0.3;
      const entranceHeat = Math.max(0, 1 - distEntrance / 200) * 0.7;
      const parkingHeat = Math.max(0, 1 - distParking / 180) * 0.5;
      const lobbyHeat = Math.max(0, 1 - distLobby / 150) * 0.4;
      const intensity = Math.min(1, base + entranceHeat + parkingHeat + lobbyHeat);
      cells.push({ x, y, intensity });
    }
  }
  return cells;
})();

// Breach prediction zones
const BREACH_ZONES = [
  { x: 520, y: 260, w: 80, h: 50, risk: "HIGH", label: "Entrance Blind Spot" },
  { x: 350, y: 250, w: 60, h: 50, risk: "MEDIUM", label: "Corridor Gap" },
  { x: 50, y: 200, w: 70, h: 100, risk: "MEDIUM", label: "Lobby Perimeter" },
];

function getCoverageConePath(x: number, y: number, angle: number, fov: number, radius: number = 80) {
  const startAngle = ((angle - fov / 2) * Math.PI) / 180;
  const endAngle = ((angle + fov / 2) * Math.PI) / 180;
  const x1 = x + radius * Math.cos(startAngle);
  const y1 = y + radius * Math.sin(startAngle);
  const x2 = x + radius * Math.cos(endAngle);
  const y2 = y + radius * Math.sin(endAngle);
  const largeArc = fov > 180 ? 1 : 0;
  return `M ${x} ${y} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

const sensorColors: Record<string, string> = {
  active: "hsl(var(--sentinel-green))",
  triggered: "hsl(var(--sentinel-red))",
  closed: "hsl(var(--sentinel-cyan))",
  open: "hsl(var(--sentinel-amber))",
  normal: "hsl(var(--sentinel-green))",
};

export default function FloorplanView() {
  const [showCameras, setShowCameras] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"2d" | "iso">("iso");

  const { data: cameras } = useQuery({
    queryKey: ["cameras"],
    queryFn: async () => {
      const { data } = await supabase.from("cameras").select("*");
      return data ?? [];
    },
  });

  const { data: detections } = useQuery({
    queryKey: ["all-detections"],
    queryFn: async () => {
      const { data } = await supabase.from("detections").select("*");
      return data ?? [];
    },
  });

  const totalDetections = detections?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Map className="h-6 w-6 text-primary" />
              Facility Floorplan
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Interactive 3D security overlay · {cameras?.length ?? 0} cameras · {totalDetections} detections
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant={viewMode === "iso" ? "default" : "outline"}
              onClick={() => setViewMode("iso")}
            >
              3D Isometric
            </Button>
            <Button
              size="sm"
              variant={viewMode === "2d" ? "default" : "outline"}
              onClick={() => setViewMode("2d")}
            >
              2D Flat
            </Button>
          </div>
        </div>

        {/* Layer toggles */}
        <div className="flex flex-wrap gap-4 glass-panel rounded-lg p-3">
          {[
            { label: "Cameras", icon: Camera, value: showCameras, set: setShowCameras },
            { label: "Heatmap", icon: Flame, value: showHeatmap, set: setShowHeatmap },
            { label: "Sensors", icon: Eye, value: showSensors, set: setShowSensors },
            { label: "Predictions", icon: AlertTriangle, value: showPredictions, set: setShowPredictions },
          ].map((layer) => (
            <div key={layer.label} className="flex items-center gap-2">
              <Switch checked={layer.value} onCheckedChange={layer.set} />
              <layer.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{layer.label}</span>
            </div>
          ))}
        </div>

        {/* Floorplan */}
        <div className="gradient-card border border-border rounded-lg p-4 overflow-auto">
          <div
            className="mx-auto transition-transform duration-500"
            style={{
              width: 800,
              perspective: viewMode === "iso" ? "1200px" : "none",
            }}
          >
            <div
              className="transition-transform duration-500"
              style={{
                transform: viewMode === "iso" ? "rotateX(55deg) rotateZ(-35deg) scale(0.85)" : "none",
                transformOrigin: "center center",
                transformStyle: "preserve-3d",
              }}
            >
              <svg
                viewBox="0 0 800 500"
                width="800"
                height="500"
                className="w-full h-auto"
                style={{ filter: viewMode === "iso" ? "drop-shadow(0 20px 40px rgba(0,0,0,0.4))" : undefined }}
              >
                {/* Background */}
                <rect x="0" y="0" width="800" height="500" fill="hsl(var(--background))" rx="8" />

                {/* Grid */}
                {Array.from({ length: 20 }, (_, i) => (
                  <line
                    key={`gv-${i}`}
                    x1={i * 40}
                    y1={0}
                    x2={i * 40}
                    y2={500}
                    stroke="hsl(var(--border))"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                ))}
                {Array.from({ length: 13 }, (_, i) => (
                  <line
                    key={`gh-${i}`}
                    x1={0}
                    y1={i * 40}
                    x2={800}
                    y2={i * 40}
                    stroke="hsl(var(--border))"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                ))}

                {/* Heatmap layer */}
                {showHeatmap &&
                  HEATMAP_CELLS.map((cell, i) => (
                    <rect
                      key={`h-${i}`}
                      x={cell.x}
                      y={cell.y}
                      width={40}
                      height={40}
                      fill={cell.intensity > 0.6 ? "hsl(var(--sentinel-red))" : cell.intensity > 0.3 ? "hsl(var(--sentinel-amber))" : "hsl(var(--sentinel-green))"}
                      opacity={cell.intensity * 0.25}
                    />
                  ))}

                {/* Rooms */}
                {BUILDING.rooms.map((room) => (
                  <g key={room.id}>
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.w}
                      height={room.h}
                      fill="hsl(var(--card))"
                      stroke="hsl(var(--border))"
                      strokeWidth="1.5"
                      rx="4"
                    />
                    <text
                      x={room.x + room.w / 2}
                      y={room.y + room.h / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="hsl(var(--muted-foreground))"
                      fontSize="11"
                      fontFamily="Inter, sans-serif"
                    >
                      {room.label}
                    </text>
                  </g>
                ))}

                {/* Breach prediction zones */}
                {showPredictions &&
                  BREACH_ZONES.map((zone, i) => (
                    <g key={`bz-${i}`}>
                      <rect
                        x={zone.x}
                        y={zone.y}
                        width={zone.w}
                        height={zone.h}
                        fill="hsl(var(--sentinel-amber))"
                        opacity="0.15"
                        rx="4"
                        className="animate-border-pulse"
                      >
                        <animate attributeName="opacity" values="0.1;0.25;0.1" dur="2s" repeatCount="indefinite" />
                      </rect>
                      <rect
                        x={zone.x}
                        y={zone.y}
                        width={zone.w}
                        height={zone.h}
                        fill="none"
                        stroke="hsl(var(--sentinel-amber))"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        rx="4"
                        opacity="0.6"
                      />
                      <text
                        x={zone.x + zone.w / 2}
                        y={zone.y - 6}
                        textAnchor="middle"
                        fill="hsl(var(--sentinel-amber))"
                        fontSize="8"
                        fontWeight="bold"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        ⚠ {zone.risk}
                      </text>
                      <text
                        x={zone.x + zone.w / 2}
                        y={zone.y + zone.h + 12}
                        textAnchor="middle"
                        fill="hsl(var(--sentinel-amber))"
                        fontSize="7"
                        fontFamily="Inter, sans-serif"
                        opacity="0.8"
                      >
                        {zone.label}
                      </text>
                    </g>
                  ))}

                {/* Camera coverage cones */}
                {showCameras &&
                  CAMERA_POSITIONS.map((cam, i) => {
                    const camera = cameras?.[cam.idx];
                    const isOnline = camera?.status === "online";
                    const isSelected = selectedCamera === cam.idx;
                    return (
                      <g
                        key={`cam-${i}`}
                        onClick={() => setSelectedCamera(isSelected ? null : cam.idx)}
                        className="cursor-pointer"
                      >
                        {/* Coverage cone */}
                        <path
                          d={getCoverageConePath(cam.x, cam.y, cam.angle, cam.fov)}
                          fill={isOnline ? "hsl(var(--sentinel-cyan))" : "hsl(var(--muted-foreground))"}
                          opacity={isSelected ? 0.3 : 0.12}
                          stroke={isOnline ? "hsl(var(--sentinel-cyan))" : "hsl(var(--muted-foreground))"}
                          strokeWidth={isSelected ? 1.5 : 0.5}
                        />
                        {/* Camera dot */}
                        <circle
                          cx={cam.x}
                          cy={cam.y}
                          r={isSelected ? 7 : 5}
                          fill={isOnline ? "hsl(var(--sentinel-cyan))" : "hsl(var(--muted-foreground))"}
                          stroke="hsl(var(--background))"
                          strokeWidth="2"
                        >
                          {isOnline && (
                            <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
                          )}
                        </circle>
                        {/* Camera label */}
                        <text
                          x={cam.x}
                          y={cam.y - 12}
                          textAnchor="middle"
                          fill={isOnline ? "hsl(var(--sentinel-cyan))" : "hsl(var(--muted-foreground))"}
                          fontSize="8"
                          fontWeight="600"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {camera?.name ? camera.name.substring(0, 10) : `CAM-${i + 1}`}
                        </text>
                      </g>
                    );
                  })}

                {/* Sensors */}
                {showSensors &&
                  SENSORS.map((sensor) => (
                    <g key={sensor.id}>
                      <circle
                        cx={sensor.x}
                        cy={sensor.y}
                        r={4}
                        fill={sensorColors[sensor.status] ?? "hsl(var(--muted-foreground))"}
                      >
                        {sensor.status === "triggered" && (
                          <animate attributeName="r" values="4;8;4" dur="1s" repeatCount="indefinite" />
                        )}
                      </circle>
                      <circle
                        cx={sensor.x}
                        cy={sensor.y}
                        r={8}
                        fill="none"
                        stroke={sensorColors[sensor.status] ?? "hsl(var(--muted-foreground))"}
                        strokeWidth="0.5"
                        opacity="0.4"
                      />
                      <text
                        x={sensor.x + 12}
                        y={sensor.y + 3}
                        fill="hsl(var(--muted-foreground))"
                        fontSize="7"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {sensor.type}
                      </text>
                    </g>
                  ))}
              </svg>
            </div>
          </div>
        </div>

        {/* Selected camera detail */}
        {selectedCamera !== null && cameras?.[selectedCamera] && (
          <div className="glass-panel rounded-lg p-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <Camera className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">{cameras[selectedCamera].name}</h3>
                <p className="text-sm text-muted-foreground">{cameras[selectedCamera].location}</p>
              </div>
              <Badge className={cameras[selectedCamera].status === "online" ? "bg-sentinel-green text-primary-foreground" : "bg-muted text-muted-foreground"}>
                {cameras[selectedCamera].status}
              </Badge>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Resolution</p>
                <p className="text-sm font-mono">{cameras[selectedCamera].resolution} · {cameras[selectedCamera].fps}fps</p>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "High Risk Zone", color: "bg-sentinel-red", desc: "Frequent incidents" },
            { label: "Medium Risk", color: "bg-sentinel-amber", desc: "Moderate activity" },
            { label: "Low Risk", color: "bg-sentinel-green", desc: "Normal baseline" },
            { label: "Predicted Breach", color: "bg-sentinel-amber", desc: "AI prediction", dashed: true },
          ].map((item) => (
            <div key={item.label} className="glass-panel rounded-lg p-3 flex items-center gap-2">
              <div className={`h-3 w-3 rounded-sm ${item.color} ${item.dashed ? "border border-dashed border-sentinel-amber" : ""}`} style={{ opacity: item.dashed ? 0.5 : 0.6 }} />
              <div>
                <p className="text-xs font-medium">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
