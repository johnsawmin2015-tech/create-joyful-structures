import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CameraFeedCard } from "@/components/sentinel/CameraFeedCard";
import { AlertCard, NowTickProvider } from "@/components/sentinel/AlertCard";
import { TimelineEventRow, TIMELINE_GRID } from "@/components/sentinel/TimelineEventRow";
import { SystemHealthWidget } from "@/components/sentinel/SystemHealthWidget";
import { CameraDetailSheet } from "@/components/sentinel/CameraDetailSheet";
import {
  MOCK_CAMERAS,
  MOCK_ALERTS,
  MOCK_TIMELINE,
  MOCK_SYSTEM_HEALTH,
  SEVERITIES,
  SEVERITY_LABEL_SHORT,
  SEVERITY_ORDER,
  type Alert,
  type Camera,
  type Severity,
  type SystemHealth,
  type TimelineEvent,
} from "@/lib/sentinel-mock";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Filter, Grid2x2, Grid3x3, LayoutGrid, Search, ShieldAlert, X, ChevronUp, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

type GridLayout = "4" | "9" | "16";
type SeverityFilter = "all" | Severity;

const GRID_CLASSES: Record<GridLayout, string> = {
  "4":  "grid-cols-1 sm:grid-cols-2",
  "9":  "grid-cols-2 md:grid-cols-3",
  "16": "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
};

const GRID_ICON: Record<GridLayout, React.ComponentType<{ className?: string }>> = {
  "4": Grid2x2,
  "9": Grid3x3,
  "16": LayoutGrid,
};

const HISTORY_LEN = 24;

export default function Dashboard() {
  // ───────── State ─────────────────────────────────────────────────
  const [cameras, setCameras] = useState<Camera[]>(MOCK_CAMERAS);
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(MOCK_TIMELINE);
  const [health, setHealth] = useState<Omit<SystemHealth, "criticalAlertCount">>(() => {
    const { criticalAlertCount: _ignore, ...rest } = MOCK_SYSTEM_HEALTH;
    return rest;
  });
  const [wsState, setWsState] = useState<"connected" | "reconnecting" | "disconnected">("connected");

  // History buffers for sparklines
  const [inferenceHistory, setInferenceHistory] = useState<number[]>(() =>
    Array.from({ length: HISTORY_LEN }, () => MOCK_SYSTEM_HEALTH.inferenceLatencyP95ms)
  );
  const [brokerHistory, setBrokerHistory] = useState<number[]>(() =>
    Array.from({ length: HISTORY_LEN }, () => MOCK_SYSTEM_HEALTH.brokerLagMs)
  );

  const [gridLayout, setGridLayout] = useState<GridLayout>("9");
  const [cameraQuery, setCameraQuery] = useState("");
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [timelineQuery, setTimelineQuery] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [followCameraSelection, setFollowCameraSelection] = useState(true);

  const cameraSearchRef = useRef<HTMLInputElement>(null);

  // ───────── Simulated real-time pipeline ──────────────────────────
  useEffect(() => {
    const i = setInterval(() => {
      // New event injection (60% probability)
      if (Math.random() > 0.4) {
        const cam = MOCK_CAMERAS[Math.floor(Math.random() * MOCK_CAMERAS.length)];
        const types = ["person_detected", "vehicle_detected", "loitering", "license_plate_read", "tailgating"];
        const evt: TimelineEvent = {
          eventId: `EVT-${Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, "0")}`,
          cameraId: cam.cameraId,
          eventType: types[Math.floor(Math.random() * types.length)],
          confidence: 0.6 + Math.random() * 0.4,
          timestamp: new Date().toISOString(),
          metadata: {
            boundingBox: { x: Math.random(), y: Math.random(), w: 0.18, h: 0.32 },
            inferenceMs: 18 + Math.floor(Math.random() * 30),
            modelVersion: "yolo-v8m@2.1.4",
          },
        };
        setTimeline((t) => [evt, ...t].slice(0, 100));
      }

      // Health drift
      setHealth((h) => {
        const next = {
          ...h,
          inferenceLatencyP95ms: Math.max(40, Math.min(180, h.inferenceLatencyP95ms + (Math.random() - 0.5) * 14)),
          brokerLagMs: Math.max(2, Math.min(80, h.brokerLagMs + (Math.random() - 0.5) * 6)),
        };
        setInferenceHistory((s) => [...s.slice(-HISTORY_LEN + 1), next.inferenceLatencyP95ms]);
        setBrokerHistory((s) => [...s.slice(-HISTORY_LEN + 1), next.brokerLagMs]);
        return next;
      });

      // Camera risk drift
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

  // ───────── WS heartbeat (simulated) ─────────────────────────────
  // Brief "reconnecting" pulse every ~45s simulates the SWR-on-reconnect path.
  useEffect(() => {
    const t = setInterval(() => {
      setWsState("reconnecting");
      setTimeout(() => setWsState("connected"), 1500);
    }, 45_000);
    return () => clearInterval(t);
  }, []);

  // ───────── Keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isInput = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName);
      if (e.key === "/" && !isInput) {
        e.preventDefault();
        cameraSearchRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (detailOpen) setDetailOpen(false);
        else if (selectedCameraId) setSelectedCameraId(null);
      }
      if (!isInput && (e.key === "1" || e.key === "2" || e.key === "3")) {
        const map: Record<string, GridLayout> = { "1": "4", "2": "9", "3": "16" };
        setGridLayout(map[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailOpen, selectedCameraId]);

  // ───────── Derived state ────────────────────────────────────────
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

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
      const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (sev !== 0) return sev;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [alerts]);

  const criticalActive = useMemo(
    () => sortedAlerts.filter((a) => a.severity === "critical" && !a.acknowledged),
    [sortedAlerts]
  );
  const activeAlertCount = useMemo(
    () => sortedAlerts.filter((a) => !a.acknowledged).length,
    [sortedAlerts]
  );

  // Derived health (criticalAlertCount is a function of alerts, not separately mutated)
  const fullHealth: SystemHealth = useMemo(
    () => ({ ...health, criticalAlertCount: criticalActive.length }),
    [health, criticalActive.length]
  );

  const eventTypes = useMemo(() => {
    const set = new Set(timeline.map((e) => e.eventType));
    return Array.from(set).sort();
  }, [timeline]);

  // Filter timeline: severity follows selection if user enabled "follow camera"
  const filteredTimeline = useMemo(() => {
    let list = timeline;
    if (eventTypeFilter !== "all") list = list.filter((e) => e.eventType === eventTypeFilter);
    if (followCameraSelection && selectedCameraId) list = list.filter((e) => e.cameraId === selectedCameraId);
    if (timelineQuery) {
      const q = timelineQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.cameraId.toLowerCase().includes(q) ||
          e.eventType.toLowerCase().includes(q) ||
          e.eventId.toLowerCase().includes(q)
      );
    }
    return list.slice(0, 80);
  }, [timeline, eventTypeFilter, timelineQuery, selectedCameraId, followCameraSelection]);

  const filteredAlerts = useMemo(() => {
    let list = sortedAlerts;
    if (severityFilter !== "all") list = list.filter((a) => a.severity === severityFilter);
    if (followCameraSelection && selectedCameraId) list = list.filter((a) => a.cameraId === selectedCameraId);
    return list;
  }, [sortedAlerts, severityFilter, selectedCameraId, followCameraSelection]);

  const selectedCamera = selectedCameraId ? cameraById[selectedCameraId] ?? null : null;
  const selectedCameraAlerts = useMemo(
    () => sortedAlerts.filter((a) => a.cameraId === selectedCameraId),
    [sortedAlerts, selectedCameraId]
  );
  const selectedCameraEvents = useMemo(
    () => timeline.filter((e) => e.cameraId === selectedCameraId),
    [timeline, selectedCameraId]
  );

  // ───────── Handlers ─────────────────────────────────────────────
  const handleAcknowledge = (alertId: string) =>
    setAlerts((as) => as.map((a) => (a.alertId === alertId ? { ...a, acknowledged: true } : a)));

  const handleAckAllCritical = () =>
    setAlerts((as) => as.map((a) => (a.severity === "critical" ? { ...a, acknowledged: true } : a)));

  const handleAckAll = () => setAlerts((as) => as.map((a) => ({ ...a, acknowledged: true })));

  const onSelectCamera = (id: string) => {
    setSelectedCameraId((curr) => (curr === id ? null : id));
  };
  const onExpandCamera = (id: string) => {
    setSelectedCameraId(id);
    setDetailOpen(true);
  };

  const showBanner = criticalActive.length > 0 && !bannerDismissed;
  const banner = criticalActive[0];

  // ───────── Render ──────────────────────────────────────────────
  return (
    <DashboardLayout>
      <NowTickProvider>
        <div className="space-y-6 max-w-[1600px] mx-auto pb-8">
          {/* ─── Hero / Command bar ───────────────────────────────── */}
          <header className="flex items-end justify-between flex-wrap gap-4 pt-1">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="eyebrow">Operations · Tier 1 · Live</span>
                <span className="h-1 w-1 rounded-full bg-sentinel-green animate-pulse" aria-hidden />
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-sentinel-green">streaming</span>
              </div>
              <h1 className="display-h1 text-4xl sm:text-5xl text-foreground">
                Command <span className="text-muted-foreground/60">/</span> Live
              </h1>
              <p className="text-xs font-mono text-muted-foreground">
                <span className="data-num text-foreground">{filteredCameras.length}</span> cameras
                <span className="text-muted-foreground/40 mx-1.5">·</span>
                <span className="data-num text-foreground">{activeAlertCount}</span> active alerts
                <span className="text-muted-foreground/40 mx-1.5">·</span>
                <span className="data-num text-primary">{fullHealth.inferenceLatencyP95ms.toFixed(0)}ms</span> p95
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/70 hidden md:inline">
                <kbd className="kbd mr-1.5">/</kbd>focus search
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/70 hidden md:inline">
                <kbd className="kbd mr-1.5">1</kbd><kbd className="kbd mr-1.5">2</kbd><kbd className="kbd mr-1.5">3</kbd>grid
              </span>
            </div>
          </header>

          {/* ─── Critical incident banner ─────────────────────────── */}
          {showBanner && banner && (
            <div className="relative rounded-md p-4 surface-1 border-sentinel-red/40 animate-glow-pulse-red animate-fade-in-up">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-full bg-sentinel-red/10 border border-sentinel-red/40 flex items-center justify-center">
                    <ShieldAlert className="h-4 w-4 text-sentinel-red" aria-hidden />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-sentinel-red bg-sentinel-red/10 border border-sentinel-red/40 px-1.5 py-0.5 rounded-sm">
                      Critical Incident
                    </span>
                    <span className="text-[10px] font-mono text-sentinel-red/80 uppercase tracking-wider">
                      {banner.eventType.replace(/_/g, " ")}
                    </span>
                    {criticalActive.length > 1 && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded-sm">
                        +{criticalActive.length - 1} more in queue
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground font-medium truncate">{banner.message}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">
                    {cameraById[banner.cameraId]?.label} · {cameraById[banner.cameraId]?.location} · confidence {(banner.confidence * 100).toFixed(0)}%
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSelectedCameraId(banner.cameraId); setDetailOpen(true); }}
                    className="h-8 text-[11px] uppercase tracking-wider font-mono border-border hover:border-foreground"
                  >
                    Inspect
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAcknowledge(banner.alertId)}
                    className="h-8 text-[11px] uppercase tracking-wider font-mono bg-sentinel-red text-severity-critical-fg hover:bg-sentinel-red/90"
                  >
                    Acknowledge
                  </Button>
                  {criticalActive.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleAckAllCritical}
                      className="h-8 text-[11px] uppercase tracking-wider font-mono text-muted-foreground hover:text-foreground"
                    >
                      Ack all
                    </Button>
                  )}
                  <button
                    onClick={() => setBannerDismissed(true)}
                    aria-label="Dismiss banner"
                    className="h-7 w-7 rounded-sm hover:bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Telemetry rail ───────────────────────────────────── */}
          <SystemHealthWidget
            health={fullHealth}
            wsState={wsState}
            inferenceHistory={inferenceHistory}
            brokerHistory={brokerHistory}
          />

          {/* ─── Operational grid ─────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
            {/* ── Camera grid (center) ───────────────────────────── */}
            <section aria-label="Camera grid" className="space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Radio className="h-3.5 w-3.5 text-primary" aria-hidden />
                    <h2 className="text-sm font-medium tracking-wide">Live Feeds</h2>
                  </div>
                  <span className="h-3 w-px bg-border" aria-hidden />
                  <span className="text-[10px] font-mono text-muted-foreground data-num">
                    {visibleCameras.length}/{cameras.length} shown
                  </span>
                  {selectedCameraId && (
                    <button
                      onClick={() => setSelectedCameraId(null)}
                      className="text-[10px] font-mono text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <X className="h-2.5 w-2.5" />
                      clear selection
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" aria-hidden />
                    <Input
                      ref={cameraSearchRef}
                      placeholder="Filter cameras"
                      value={cameraQuery}
                      onChange={(e) => setCameraQuery(e.target.value)}
                      className="h-8 w-52 pl-8 pr-12 text-xs bg-card border-border font-mono"
                      aria-label="Filter cameras"
                    />
                    <kbd className="kbd absolute right-2 top-1/2 -translate-y-1/2">/</kbd>
                  </div>
                  <div className="flex items-center bg-card border border-border rounded-md p-0.5 gap-0.5">
                    {(["4", "9", "16"] as GridLayout[]).map((g) => {
                      const Icon = GRID_ICON[g];
                      const active = gridLayout === g;
                      return (
                        <button
                          key={g}
                          onClick={() => setGridLayout(g)}
                          aria-label={`${g} camera grid`}
                          aria-pressed={active}
                          className={`h-7 w-7 flex items-center justify-center rounded-sm transition-all ${
                            active
                              ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)]"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
                {visibleCameras.map((cam, i) => (
                  <CameraFeedCard
                    key={cam.cameraId}
                    camera={cam}
                    selected={selectedCameraId === cam.cameraId}
                    onSelect={onSelectCamera}
                    onExpand={onExpandCamera}
                    lastSeenIso={cam.lastAlert}
                    delay={i * 35}
                  />
                ))}
                {visibleCameras.length === 0 && (
                  <div className="col-span-full text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-md font-mono">
                    No cameras match &quot;{cameraQuery}&quot;
                  </div>
                )}
              </div>
            </section>

            {/* ── Priority Alerts (right) ────────────────────────── */}
            <aside aria-label="Priority alerts" className="space-y-3 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-7rem)] flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-sentinel-amber" aria-hidden />
                  <h2 className="text-sm font-medium tracking-wide">Priority Queue</h2>
                  <span className="h-3 w-px bg-border" aria-hidden />
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-sentinel-red/10 text-sentinel-red border border-sentinel-red/30 data-num">
                    {activeAlertCount} live
                  </span>
                </div>
                {activeAlertCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAckAll}
                    className="h-6 text-[10px] uppercase tracking-wider font-mono text-muted-foreground hover:text-foreground"
                  >
                    Ack all
                  </Button>
                )}
              </div>

              {selectedCameraId && (
                <label className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground bg-muted/30 border border-border rounded-sm px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={followCameraSelection}
                    onChange={(e) => setFollowCameraSelection(e.target.checked)}
                    className="accent-primary"
                  />
                  Filter to {cameraById[selectedCameraId]?.label}
                </label>
              )}

              <Tabs value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}>
                <TabsList className="bg-card border border-border h-8 w-full p-0.5 gap-px">
                  <TabsTrigger value="all" className="text-[10px] h-full uppercase tracking-wider font-mono flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                    All
                  </TabsTrigger>
                  {SEVERITIES.map((s) => (
                    <TabsTrigger
                      key={s}
                      value={s}
                      className="text-[10px] h-full uppercase tracking-wider font-mono flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                    >
                      {SEVERITY_LABEL_SHORT[s]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="space-y-1.5 xl:overflow-y-auto xl:flex-1 pr-1 -mr-1">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground border border-dashed border-border rounded-md font-mono">
                    No alerts match filter
                  </div>
                ) : (
                  filteredAlerts.map((alert) => (
                    <AlertCard
                      key={alert.alertId}
                      alert={alert}
                      cameraLabel={cameraById[alert.cameraId]?.label}
                      onAcknowledge={handleAcknowledge}
                      onSelect={(a) => { setSelectedCameraId(a.cameraId); }}
                    />
                  ))
                )}
              </div>
            </aside>
          </div>

          {/* ─── Event Timeline (bottom) ──────────────────────────── */}
          <section aria-label="Event timeline" className="surface-1 rounded-md overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-3 border-b border-border flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-primary" aria-hidden />
                <h2 className="text-sm font-medium tracking-wide">Event Timeline</h2>
                <span className="h-3 w-px bg-border" aria-hidden />
                <span className="text-[10px] font-mono text-muted-foreground data-num">
                  {filteredTimeline.length} events
                </span>
                <span className="text-[10px] font-mono text-sentinel-green inline-flex items-center gap-1">
                  <ChevronUp className="h-2.5 w-2.5" aria-hidden />
                  streaming
                </span>
                {followCameraSelection && selectedCameraId && (
                  <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded-sm">
                    filtered: {cameraById[selectedCameraId]?.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" aria-hidden />
                  <Input
                    placeholder="Search events"
                    value={timelineQuery}
                    onChange={(e) => setTimelineQuery(e.target.value)}
                    className="h-7 w-52 pl-8 text-xs bg-background font-mono"
                    aria-label="Search events"
                  />
                </div>
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger className="w-44 h-7 text-xs bg-background font-mono">
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
            <div className={`grid ${TIMELINE_GRID} items-center gap-3 px-3 py-2 bg-muted/30 border-b border-border sticky top-0 z-10`}>
              <span aria-hidden />
              <span className="eyebrow">Time</span>
              <span className="eyebrow">Camera</span>
              <span className="eyebrow">Event</span>
              <span className="eyebrow">Confidence</span>
              <span className="eyebrow">Event ID</span>
            </div>

            <div className="max-h-[28rem] overflow-y-auto">
              {filteredTimeline.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground font-mono">No events match filter</div>
              ) : (
                filteredTimeline.map((event) => (
                  <TimelineEventRow
                    key={event.eventId}
                    event={event}
                    cameraLabel={cameraById[event.cameraId]?.label}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-border bg-muted/20 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>Showing {Math.min(filteredTimeline.length, 80)} most recent · auto-scroll on</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sentinel-green animate-pulse" aria-hidden />
                live · sync via WS
              </span>
            </div>
          </section>
        </div>

        {/* ─── Camera detail drawer ───────────────────────────────── */}
        <CameraDetailSheet
          camera={selectedCamera}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          recentAlerts={selectedCameraAlerts}
          recentEvents={selectedCameraEvents}
        />
      </NowTickProvider>
    </DashboardLayout>
  );
}

