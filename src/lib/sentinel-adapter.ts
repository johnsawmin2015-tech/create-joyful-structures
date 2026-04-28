/**
 * SENTINEL — Adapter layer
 *
 * Maps Supabase DB rows -> canonical SENTINEL types defined in `sentinel-mock.ts`.
 * Keeping this isolated means the UI never reaches into raw DB shapes, and the
 * server-side schema can evolve independently of the canonical contract.
 *
 * All functions are pure, sync, and dependency-free for cheap re-derivation in
 * `useMemo` / TanStack Query selectors.
 */

import type { Database } from "@/integrations/supabase/types";
import type {
  Alert,
  Camera,
  Severity,
  SystemHealth,
  TimelineEvent,
  AIStatus,
  CameraStatus,
} from "./sentinel-mock";

type CameraRow    = Database["public"]["Tables"]["cameras"]["Row"];
type AlertRow     = Database["public"]["Tables"]["alerts"]["Row"];
type DetectionRow = Database["public"]["Tables"]["detections"]["Row"];

// ─── Camera ───────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, CameraStatus> = {
  active: "live",
  online: "live",
  live: "live",
  degraded: "degraded",
  maintenance: "degraded",
  warning: "degraded",
  inactive: "offline",
  offline: "offline",
  error: "offline",
};

function deriveAiStatus(status: CameraStatus): AIStatus {
  switch (status) {
    case "live":     return "active";
    case "degraded": return "fallback_motion";
    case "offline":  return "error";
  }
}

/**
 * Convert a `cameras` row to a canonical Camera. `riskScore` and `lastAlert`
 * are joined in via `enrichCameras()` because they require alert context.
 */
export function cameraFromRow(row: CameraRow): Camera {
  const status = STATUS_MAP[row.status?.toLowerCase() ?? ""] ?? "live";
  return {
    cameraId:   row.id,
    label:      row.name,
    location:   row.location ?? "Unknown",
    streamUrl:  row.rtsp_url ?? "",
    status,
    riskScore:  0,
    lastAlert:  null,
    aiStatus:   deriveAiStatus(status),
  };
}

// Severity weights for the risk-score reduce.
const SEV_WEIGHT: Record<Severity, number> = { critical: 40, high: 22, medium: 10, low: 4 };

/**
 * Compute a 0-100 risk score from a camera's recent alerts.
 * Severity-weighted, exponential decay with half-life of 30 minutes.
 * Acknowledged alerts contribute at 30% weight (incident still recent).
 */
export function computeRiskScore(cameraAlerts: Alert[], now = Date.now()): number {
  if (cameraAlerts.length === 0) return 0;
  const HALF_LIFE_MS = 30 * 60 * 1000;
  let score = 0;
  for (const a of cameraAlerts) {
    const age = now - new Date(a.timestamp).getTime();
    const decay = Math.pow(0.5, age / HALF_LIFE_MS);
    const w = SEV_WEIGHT[a.severity] * (a.acknowledged ? 0.3 : 1);
    score += w * decay;
  }
  return Math.min(100, Math.round(score));
}

/**
 * Join cameras with their alerts to populate `riskScore` + `lastAlert`.
 */
export function enrichCameras(cameras: Camera[], alerts: Alert[]): Camera[] {
  // Bucket alerts by cameraId for O(N+M) instead of O(N*M).
  const byCam: Record<string, Alert[]> = {};
  for (const a of alerts) (byCam[a.cameraId] ??= []).push(a);

  return cameras.map((c) => {
    const list = byCam[c.cameraId] ?? [];
    const last = list.reduce<string | null>((acc, a) => {
      if (!acc) return a.timestamp;
      return new Date(a.timestamp).getTime() > new Date(acc).getTime() ? a.timestamp : acc;
    }, null);
    return {
      ...c,
      riskScore: c.status === "offline" ? 0 : computeRiskScore(list),
      lastAlert: last,
    };
  });
}

// ─── Alert ────────────────────────────────────────────────────────────────

const SEV_SET: ReadonlySet<Severity> = new Set(["critical", "high", "medium", "low"]);

// DB has no `confidence` column on alerts; synthesize from severity to keep the
// canonical contract stable. Real pipeline should add this column upstream.
const SEV_CONFIDENCE: Record<Severity, number> = {
  critical: 0.95,
  high:     0.85,
  medium:   0.72,
  low:      0.6,
};

export function alertFromRow(row: AlertRow): Alert {
  const sev = (row.severity?.toLowerCase() ?? "medium") as Severity;
  const severity: Severity = SEV_SET.has(sev) ? sev : "medium";
  return {
    alertId:      row.id,
    cameraId:     row.camera_id ?? "UNKNOWN",
    severity,
    eventType:    row.type,
    confidence:   SEV_CONFIDENCE[severity],
    timestamp:    row.created_at,
    acknowledged: !!row.acknowledged,
    message:      row.message,
  };
}

// ─── Timeline event ───────────────────────────────────────────────────────

export function eventFromDetection(row: DetectionRow): TimelineEvent {
  // bounding_box in DB is `Json | null`; coerce to a safe shape.
  const bb = row.bounding_box as Record<string, unknown> | null;
  return {
    eventId:    row.id,
    cameraId:   row.camera_id ?? "UNKNOWN",
    eventType:  row.object_type,
    confidence: row.confidence,
    timestamp:  row.created_at,
    metadata: {
      boundingBox: bb ?? null,
      objectClass: row.object_type,
      modelVersion: "yolo-v8m",
    },
  };
}

// ─── System health ────────────────────────────────────────────────────────

interface HealthInputs {
  cameras: Camera[];
  alerts: Alert[];
  events: TimelineEvent[];
  /** Optional override from system_settings. */
  inferenceP95FromSettings?: number;
  brokerLagFromSettings?: number;
}

/**
 * Derive SystemHealth from current canonical state.
 *
 * `inferenceLatencyP95ms` and `brokerLagMs` aren't stored per-row; the spec
 * pipeline emits them as Kafka metrics. Until that wiring exists we either
 * read overrides (passed from a `system_settings` query) or default to 0.
 */
export function deriveHealth({
  cameras,
  alerts,
  inferenceP95FromSettings = 0,
  brokerLagFromSettings = 0,
}: HealthInputs): SystemHealth {
  return {
    totalStreams:          cameras.length,
    activeStreams:         cameras.filter((c) => c.status === "live").length,
    inferenceLatencyP95ms: inferenceP95FromSettings,
    brokerLagMs:           brokerLagFromSettings,
    criticalAlertCount:    alerts.filter((a) => a.severity === "critical" && !a.acknowledged).length,
  };
}
