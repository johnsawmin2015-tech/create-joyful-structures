import { DashboardLayout } from "@/components/DashboardLayout";
import { Settings, Shield, Cpu, Database, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const systemInfo = [
  { label: "Platform Version", value: "SentinelCore v0.1.0 (MVP)", icon: Shield },
  { label: "Inference Engine", value: "YOLO v8 — Object Detection", icon: Cpu },
  { label: "Database", value: "PostgreSQL — Connected", icon: Database },
  { label: "Streaming Protocol", value: "RTSP via FFmpeg", icon: Wifi },
];

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
            <p className="text-muted-foreground text-sm">Platform configuration and status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemInfo.map((info) => (
            <div key={info.label} className="gradient-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <info.icon className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">{info.label}</p>
              </div>
              <p className="text-sm font-semibold">{info.value}</p>
            </div>
          ))}
        </div>

        <div className="gradient-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4">Architecture Phases</h2>
          <div className="space-y-3">
            {[
              { phase: "Phase 0 — MVP", status: "Active", desc: "Monolithic FastAPI + YOLO, direct pipeline" },
              { phase: "Phase 1 — Production", status: "Planned", desc: "Service separation, Redis, JWT auth, observability" },
              { phase: "Phase 2 — Scaling", status: "Planned", desc: "Kafka, horizontal scaling, edge inference" },
              { phase: "Phase 3 — Enterprise", status: "Planned", desc: "Kubernetes, Flink CEP, vector DB, zero trust" },
            ].map((p) => (
              <div key={p.phase} className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/50">
                <div>
                  <p className="text-sm font-medium">{p.phase}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
                <Badge variant={p.status === "Active" ? "default" : "secondary"}>{p.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="gradient-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-3">SLA / SLO Targets</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Latency (P95)", value: "≤ 100ms" },
              { label: "Uptime", value: "99.9%" },
              { label: "MTTR", value: "≤ 5 min" },
              { label: "Throughput", value: "64+ streams" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold font-mono text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
