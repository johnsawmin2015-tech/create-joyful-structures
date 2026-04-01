import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Cpu, Zap, Clock, CheckCircle2, AlertCircle, BarChart3 } from "lucide-react";

// Static model catalog (no ML backend, so these are reference configs)
const MODEL_CATALOG = [
  {
    id: "yolov10-n",
    name: "YOLOv10-N",
    category: "Object Detection",
    version: "10.0.2",
    framework: "ONNX / TensorRT",
    classes: ["Person", "Vehicle", "Bag", "Animal"],
    latency: "12ms",
    accuracy: "mAP 0.84",
    status: "deployed" as const,
    gpu: "T4 / A100",
    description: "Nano variant — optimized for edge deployment with minimal latency",
  },
  {
    id: "yolov10-x",
    name: "YOLOv10-X",
    category: "Object Detection",
    version: "10.0.2",
    framework: "ONNX / TensorRT",
    classes: ["Person", "Vehicle", "Weapon", "Fire/Smoke", "Bag", "Animal"],
    latency: "28ms",
    accuracy: "mAP 0.91",
    status: "deployed" as const,
    gpu: "A100",
    description: "Extra-large variant — maximum accuracy for critical security zones",
  },
  {
    id: "blazepose",
    name: "BlazePose + SlowFast",
    category: "Behavior Analysis",
    version: "2.1.0",
    framework: "MediaPipe + PyTorch",
    classes: ["Running", "Falling", "Fighting", "Loitering", "Tailgating"],
    latency: "45ms",
    accuracy: "Top-1 Acc 0.88",
    status: "deployed" as const,
    gpu: "T4",
    description: "Pose estimation + temporal action recognition for behavior classification",
  },
  {
    id: "arcface-r100",
    name: "ArcFace ResNet-100",
    category: "Facial Recognition",
    version: "3.0.1",
    framework: "ONNX",
    classes: ["Face Detection", "Embedding (512-d)", "Similarity Search"],
    latency: "35ms",
    accuracy: "LFW 99.83%",
    status: "standby" as const,
    gpu: "T4 / A100",
    description: "Privacy-compliant face recognition — blurring default, opt-in recognition",
  },
  {
    id: "paddleocr-lpr",
    name: "WPOD-Net + PaddleOCR",
    category: "License Plate Recognition",
    version: "1.4.0",
    framework: "PaddlePaddle + ONNX",
    classes: ["Plate Detection", "Deskew", "OCR"],
    latency: "52ms",
    accuracy: "OCR Acc 0.96",
    status: "deployed" as const,
    gpu: "T4",
    description: "Multi-region plate detection with homography correction and LSTM OCR",
  },
  {
    id: "firenet",
    name: "FireNet + Optical Flow",
    category: "Fire & Smoke Detection",
    version: "2.0.0",
    framework: "PyTorch",
    classes: ["Fire", "Smoke"],
    latency: "22ms",
    accuracy: "F1 0.94",
    status: "canary" as const,
    gpu: "T4",
    description: "Dedicated fire/smoke CNN with optical flow validation to reduce false positives",
  },
  {
    id: "csrnet",
    name: "CSRNet Crowd Counter",
    category: "Crowd Analytics",
    version: "1.2.0",
    framework: "PyTorch",
    classes: ["Headcount", "Density Heatmap"],
    latency: "38ms",
    accuracy: "MAE 4.2",
    status: "shadow" as const,
    gpu: "A100",
    description: "Crowd density estimation with heatmap generation for capacity monitoring",
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  deployed: { label: "Deployed", color: "bg-sentinel-green/20 text-sentinel-green", icon: CheckCircle2 },
  canary: { label: "Canary", color: "bg-sentinel-amber/20 text-sentinel-amber", icon: Zap },
  shadow: { label: "Shadow", color: "bg-purple-500/20 text-purple-400", icon: BarChart3 },
  standby: { label: "Standby", color: "bg-muted text-muted-foreground", icon: Clock },
};

export default function AIModels() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cameraAssignment, setCameraAssignment] = useState<Record<string, string[]>>({});

  const { data: cameras } = useQuery({
    queryKey: ["cameras"],
    queryFn: async () => {
      const { data } = await supabase.from("cameras").select("id, name").order("name");
      return data ?? [];
    },
  });

  const categories = [...new Set(MODEL_CATALOG.map((m) => m.category))];
  const filtered = categoryFilter === "all" ? MODEL_CATALOG : MODEL_CATALOG.filter((m) => m.category === categoryFilter);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Model Manager</h1>
            <p className="text-muted-foreground text-sm mt-1">Model catalog, deployment status, and camera assignments</p>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48 bg-background h-9 text-sm">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Model cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((model) => {
            const st = statusConfig[model.status];
            const StatusIcon = st.icon;
            return (
              <div key={model.id} className="gradient-card border border-border rounded-lg p-5 hover:border-glow transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{model.name}</h3>
                      <p className="text-xs text-muted-foreground">{model.category}</p>
                    </div>
                  </div>
                  <Badge className={`${st.color} text-[10px]`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {st.label}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground mb-3">{model.description}</p>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "Version", value: model.version },
                    { label: "Latency", value: model.latency },
                    { label: "Accuracy", value: model.accuracy },
                    { label: "GPU", value: model.gpu },
                  ].map((m) => (
                    <div key={m.label} className="bg-background/50 rounded p-2 text-center">
                      <p className="text-[9px] text-muted-foreground uppercase">{m.label}</p>
                      <p className="text-xs font-mono font-medium">{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Classes */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {model.classes.map((c) => (
                    <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-mono">{c}</span>
                  ))}
                </div>

                {/* Framework + Camera assignment */}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-mono">{model.framework}</span>
                  </div>
                  <Select
                    value={cameraAssignment[model.id]?.[0] || ""}
                    onValueChange={(v) => setCameraAssignment((p) => ({ ...p, [model.id]: [v] }))}
                  >
                    <SelectTrigger className="w-36 h-7 text-[10px] bg-background">
                      <SelectValue placeholder="Assign camera..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cameras?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inference metrics summary */}
        <div className="gradient-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-sentinel-amber" />
            Inference Pipeline Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Models Deployed", value: MODEL_CATALOG.filter((m) => m.status === "deployed").length, suffix: `/ ${MODEL_CATALOG.length}` },
              { label: "Avg Latency (P95)", value: "32ms", suffix: "" },
              { label: "GPU Utilization", value: "67%", suffix: "" },
              { label: "Pipeline Uptime", value: "99.97%", suffix: "SLA" },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold font-mono mt-1">
                  {m.value}
                  {m.suffix && <span className="text-xs text-muted-foreground ml-1">{m.suffix}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
