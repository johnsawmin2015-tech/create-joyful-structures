import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CameraFeedCard } from "@/components/sentinel/CameraFeedCard";
import { AlertCard } from "@/components/sentinel/AlertCard";
import { TimelineEventRow } from "@/components/sentinel/TimelineEventRow";
import { SystemHealthWidget } from "@/components/sentinel/SystemHealthWidget";
import {
  MOCK_CAMERAS,
  MOCK_ALERTS,
  MOCK_TIMELINE,
  MOCK_SYSTEM_HEALTH,
  SEVERITY_ORDER,
  type Alert,
  type Camera,
  type SystemHealth,
  type TimelineEvent,
} from "@/lib/sentinel-mock";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Filter, Grid2x2, Grid3x3, LayoutGrid, Search, ShieldAlert, X, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type GridLayout = "4" | "9" | "16";

const GRID_CLASSES: Record<GridLayout, string> = {
  "4": "grid-cols-1 sm:grid-cols-2",
  "9": "grid-cols-2 md:grid-cols-3",
  "16": "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
};

const GRID_ICON: Record<GridLayout, React.ComponentType<{ className?: string }>> = {
  "4": Grid2x2,
  "9": Grid3x3,
  "16": LayoutGrid,
};

export default function Dashboard() {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [cameras, setCameras] = useState<Camera[]>(MOCK_CAMERAS);
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(MOCK_TIMELINE);
  const [health, setHealth] = useState<SystemHealth>(MOCK_SYSTEM_HEALTH);
  const [wsState, setWsState] = useState<"connected" | "reconnecting" | "disconnected">("connected");

  const [gridLayout, setGridLayout] = useState<GridLayout>("9");
  const [cameraQuery, setCameraQuery] = useState("");
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [timelineQuery, setTimelineQuery] = useState("");
  const [showCriticalBanner, setShowCriticalBanner] = useState(true);

  // ─── Simulated real-time pipeline ──────────────────────────────────────────
  // In production: WebSocket subscription per-tenant pushes Alert/TimelineEvent
  // messages. Here we simulate stochastic event arrival.
  useEffect(() => {
    const i = setInterval(() => {
      // Occasionally inject new events
      if (Math.random() > 0.5) {
        const cam = MOCK_CAMERAS[Math.floor(Math.random() * MOCK_CAMERAS.length)];
        const types = ["person_detected", "vehicle_detected", "loitering", "license_plate_read"];
        const evt: TimelineEvent = {
          eventId: `EVT-${Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, "0")}`,
          cameraId: cam.cameraId,
          eventType: types[Math.floor(Math.random() * types.length)],
          confidence: 0.6 + Math.random() * 0.4,
          timestamp: new Date().toISOString(),
          metadata: { boundingBox: { x: Math.random(), y: Math.random(), w: 0.2, h: 0.3 }, inferenceMs: 18 + Math.floor(Math.random() * 30) },
        };
        setTimeline((t) => [evt, ...t].slice(0, 100));
      }
      // Health metrics drift
      setHealth((h) => ({
        ...h,
        inferenceLatencyP95ms: Math.max(40, Math.min(180, h.inferenceLatencyP95ms + (Math.random() - 0.5) * 12)),
        brokerLagMs: Math.max(2, Math.min(80, h.brokerLagMs + (Math.random() - 0.5) * 6)),
      }));
      // Camera risk drift (predictive: rising scores precede threshold breaches)
      setCameras((cs) =>
        cs.map((c) =>
          c.status === "offline"
            ? c
            : { ...c, riskScore: Math.max(0, Math.min(100, c.riskScore + Math.round((Math.random() - 0.45) * 6))) }
        )
      );
    }, 2200);
    return () => clearInterval(i);
  }, []);

  // ─── Derived state ──────────────────────────────────────────────────────────
  const cameraById = useMemo(() => Object.fromEntries(cameras.map((c) => [c.cameraId, c])), [cameras]);

  const filteredCameras = useMemo(() => {
    if (!cameraQuery) return cameras;
    const q = cameraQuery.toLowerCase();
    return cameras.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.cameraId.toLowerCase().includes(q)
    );
  }, [cameras, cameraQuery]);

  const visibleCameras = filteredCameras.slice(0, Number(gridLayout));

  // Priority-sorted alert feed: severity then recency
  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
      const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (sev !== 0) return sev;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [alerts]);

  const criticalActive = sortedAlerts.filter((a) => a.severity === "critical" && !a.acknowledged);
  const activeAlertCount = sortedAlerts.filter((a) => !a.acknowledged).length;

  const eventTypes = useMemo(() => {
    const set = new Set(timeline.map((e) => e.eventType));
    return Array.from(set).sort();
  }, [timeline]);

  const filteredTimeline = useMemo(() => {
    let list = timeline;
    if (eventTypeFilter !== "all") list = list.filter((e) => e.eventType === eventTypeFilter);
    if (timelineQuery) {
      const q = timelineQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.cameraId.toLowerCase().includes(q) ||
          e.eventType.toLowerCase().includes(q) ||
          e.eventId.toLowerCase().includes(q)
      );
    }
    return list.slice(0, 50);
  }, [timeline, eventTypeFilter, timelineQuery]);

  const filteredAlerts = useMemo(() => {
    if (severityFilter === "all") return sortedAlerts;
    return sortedAlerts.filter((a) => a.severity === severityFilter);
  }, [sortedAlerts, severityFilter]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleAcknowledge = (alertId: string) => {
    setAlerts((as) => as.map((a) => (a.alertId === alertId ? { ...a, acknowledged: true } : a)));
    setHealth((h) => ({ ...h, criticalAlertCount: Math.max(0, h.criticalAlertCount - 1) }));
  };
  const handleAckAll = () => {
    setAlerts((as) => as.map((a) => ({ ...a, acknowledged: true })));
    setHealth((h) => ({ ...h, criticalAlertCount: 0 }));
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* ─── Header ──────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">SOC Operations</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-card text-muted-foreground uppercase tracking-wider">
                Tier 1 · Live
              </span>
            </div>
            <p className="text-muted-foreground text-xs mt-0.5 font-mono">
              {filteredCameras.length} cameras · {activeAlertCount} active alerts ·{" "}
              <span className="text-primary">{health.inferenceLatencyP95ms.toFixed(0)}ms</span> p95 inference
            </p>
          </div>
        </header>

        {/* ─── Critical alert banner ───────────────────────────────────── */}
        {criticalActive.length > 0 && showCriticalBanner && (
          <div className="bg-sentinel-red/10 border border-sentinel-red/40 rounded-lg p-3 flex items-center gap-3 glow-red animate-pulse-glow">
            <ShieldAlert className="h-5 w-5 text-sentinel-red shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-sentinel-red">
                {criticalActive.length} CRITICAL — {criticalActive[0].eventType.replace(/_/g, " ").toUpperCase()}
              </p>
              <p className="text-xs text-sentinel-red/80 truncate font-mono">
                {cameraById[criticalActive[0].cameraId]?.label} · {criticalActive[0].message}
              </p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => handleAcknowledge(criticalActive[0].alertId)}>
              Acknowledge
            </Button>
            <button
              onClick={() => setShowCriticalBanner(false)}
              aria-label="Dismiss banner"
              className="h-6 w-6 rounded hover:bg-sentinel-red/20 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5 text-sentinel-red" />
            </button>
          </div>
        )}

        {/* ─── System health strip ────────────────────────────────────── */}
        <SystemHealthWidget health={health} wsState={wsState} />

        {/* ─── Main operational grid ──────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
          {/* Camera grid (center) */}
          <section aria-label="Camera grid" className="space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Live Feeds</h2>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {visibleCameras.length}/{cameras.length} shown
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Filter cameras..."
                    value={cameraQuery}
                    onChange={(e) => setCameraQuery(e.target.value)}
                    className="h-7 w-44 pl-7 text-xs bg-background"
                  />
                </div>
                <div className="flex items-center gap-px bg-card border border-border rounded">
                  {(["4", "9", "16"] as GridLayout[]).map((g) => {
                    const Icon = GRID_ICON[g];
                    return (
                      <button
                        key={g}
                        onClick={() => setGridLayout(g)}
                        aria-label={`${g} camera grid`}
                        className={`h-7 w-7 flex items-center justify-center transition-colors ${
                          gridLayout === g ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={`grid gap-2.5 ${GRID_CLASSES[gridLayout]}`}>
              {visibleCameras.map((cam) => (
                <CameraFeedCard
                  key={cam.cameraId}
                  camera={cam}
                  selected={selectedCameraId === cam.cameraId}
                  onSelect={(id) => setSelectedCameraId(id === selectedCameraId ? null : id)}
                  onExpand={(id) => setSelectedCameraId(id)}
                  lastSeenIso={cam.lastAlert}
                />
              ))}
              {visibleCameras.length === 0 && (
                <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
                  No cameras match "{cameraQuery}"
                </div>
              )}
            </div>
          </section>

          {/* Alert feed (right panel) */}
          <aside aria-label="Priority alerts" className="space-y-3 xl:max-h-[calc(100vh-12rem)] xl:sticky xl:top-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-sentinel-amber" />
                <h2 className="text-sm font-semibold">Priority Alerts</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sentinel-red/15 text-sentinel-red">
                  {activeAlertCount} active
                </span>
              </div>
              {activeAlertCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleAckAll} className="h-6 text-[10px]">
                  Ack all
                </Button>
              )}
            </div>

            <Tabs value={severityFilter} onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}>
              <TabsList className="bg-card h-7 w-full justify-start">
                <TabsTrigger value="all" className="text-[10px] h-6">All</TabsTrigger>
                <TabsTrigger value="critical" className="text-[10px] h-6">Crit</TabsTrigger>
                <TabsTrigger value="high" className="text-[10px] h-6">High</TabsTrigger>
                <TabsTrigger value="medium" className="text-[10px] h-6">Med</TabsTrigger>
                <TabsTrigger value="low" className="text-[10px] h-6">Low</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-1.5 xl:overflow-y-auto xl:flex-1 xl:max-h-[calc(100vh-22rem)] pr-1">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-md">
                  No alerts match filter
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <AlertCard
                    key={alert.alertId}
                    alert={alert}
                    cameraLabel={cameraById[alert.cameraId]?.label}
                    onAcknowledge={handleAcknowledge}
                    onSelect={(a) => setSelectedCameraId(a.cameraId)}
                  />
                ))
              )}
            </div>
          </aside>
        </div>

        {/* ─── Event timeline (bottom) ────────────────────────────────── */}
        <section aria-label="Event timeline" className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-3 border-b border-border flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Event Timeline</h2>
              <span className="text-[10px] font-mono text-muted-foreground">
                {filteredTimeline.length} events · live
              </span>
              <span className="text-[9px] font-mono text-sentinel-green flex items-center gap-1">
                <ChevronUp className="h-2.5 w-2.5" />
                streaming
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={timelineQuery}
                  onChange={(e) => setTimelineQuery(e.target.value)}
                  className="h-7 w-48 pl-7 text-xs bg-background"
                />
              </div>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger className="w-44 h-7 text-xs bg-background">
                  <SelectValue placeholder="All event types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All event types</SelectItem>
                  {eventTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-[16px_88px_140px_1fr_72px_80px] items-center gap-3 px-3 py-1.5 bg-muted/30 border-b border-border">
            <span />
            <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Time</span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Camera</span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Event</span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Confidence</span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Event ID</span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredTimeline.map((event) => (
              <TimelineEventRow
                key={event.eventId}
                event={event}
                cameraLabel={cameraById[event.cameraId]?.label}
              />
            ))}
            {filteredTimeline.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground">No events match filter</div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
