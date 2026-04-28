/**
 * SENTINEL — canonical mock data shapes
 * These shapes are the contract between the Stream Processing pipeline and the UI.
 * Real data sources (Supabase / WebSocket) MUST conform to these interfaces.
 */

export type CameraStatus = "live" | "degraded" | "offline";
export type AIStatus = "active" | "fallback_motion" | "raw_only" | "error";
export type Severity = "critical" | "high" | "medium" | "low";

export interface Camera {
  cameraId: string;
  label: string;
  location: string;
  streamUrl: string;
  status: CameraStatus;
  riskScore: number; // 0-100
  lastAlert: string | null; // ISO timestamp
  aiStatus: AIStatus;
}

export interface Alert {
  alertId: string;
  cameraId: string;
  severity: Severity;
  eventType: string;
  confidence: number; // 0..1
  timestamp: string; // ISO
  acknowledged: boolean;
  message?: string;
}

export interface TimelineEvent {
  eventId: string;
  cameraId: string;
  eventType: string;
  confidence: number;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface SystemHealth {
  totalStreams: number;
  activeStreams: number;
  inferenceLatencyP95ms: number;
  brokerLagMs: number;
  criticalAlertCount: number;
}

const now = Date.now();
const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

export const MOCK_CAMERAS: Camera[] = [
  { cameraId: "CAM-001", label: "CAM-01", location: "Main Entrance — North Lobby", streamUrl: "rtsp://edge-01.sentinel.local/cam01", status: "live", riskScore: 78, lastAlert: iso(45_000), aiStatus: "active" },
  { cameraId: "CAM-002", label: "CAM-02", location: "Parking Lot A — Sector 3", streamUrl: "rtsp://edge-01.sentinel.local/cam02", status: "live", riskScore: 32, lastAlert: iso(420_000), aiStatus: "active" },
  { cameraId: "CAM-003", label: "CAM-03", location: "Loading Dock B", streamUrl: "rtsp://edge-02.sentinel.local/cam03", status: "live", riskScore: 51, lastAlert: iso(180_000), aiStatus: "active" },
  { cameraId: "CAM-004", label: "CAM-04", location: "Executive Lobby", streamUrl: "rtsp://edge-02.sentinel.local/cam04", status: "live", riskScore: 18, lastAlert: null, aiStatus: "active" },
  { cameraId: "CAM-005", label: "CAM-05", location: "Server Room — Cage 1", streamUrl: "rtsp://edge-03.sentinel.local/cam05", status: "degraded", riskScore: 64, lastAlert: iso(95_000), aiStatus: "fallback_motion" },
  { cameraId: "CAM-006", label: "CAM-06", location: "Perimeter North Fence", streamUrl: "rtsp://edge-03.sentinel.local/cam06", status: "live", riskScore: 89, lastAlert: iso(8_000), aiStatus: "active" },
  { cameraId: "CAM-007", label: "CAM-07", location: "Warehouse — Aisle 4", streamUrl: "rtsp://edge-04.sentinel.local/cam07", status: "live", riskScore: 22, lastAlert: iso(900_000), aiStatus: "active" },
  { cameraId: "CAM-008", label: "CAM-08", location: "Rooftop Helipad", streamUrl: "rtsp://edge-04.sentinel.local/cam08", status: "offline", riskScore: 0, lastAlert: iso(3_600_000), aiStatus: "error" },
  { cameraId: "CAM-009", label: "CAM-09", location: "Stairwell B — Floor 3", streamUrl: "rtsp://edge-05.sentinel.local/cam09", status: "live", riskScore: 41, lastAlert: iso(240_000), aiStatus: "active" },
  { cameraId: "CAM-010", label: "CAM-10", location: "Emergency Exit West", streamUrl: "rtsp://edge-05.sentinel.local/cam10", status: "live", riskScore: 12, lastAlert: null, aiStatus: "active" },
  { cameraId: "CAM-011", label: "CAM-11", location: "Reception Desk", streamUrl: "rtsp://edge-06.sentinel.local/cam11", status: "live", riskScore: 28, lastAlert: iso(1_200_000), aiStatus: "active" },
  { cameraId: "CAM-012", label: "CAM-12", location: "Garage Level B2", streamUrl: "rtsp://edge-06.sentinel.local/cam12", status: "degraded", riskScore: 56, lastAlert: iso(60_000), aiStatus: "raw_only" },
];

export const MOCK_ALERTS: Alert[] = [
  { alertId: "ALT-9F3A21", cameraId: "CAM-006", severity: "critical", eventType: "perimeter_breach", confidence: 0.94, timestamp: iso(8_000), acknowledged: false, message: "Unauthorized entry — north fence breach detected" },
  { alertId: "ALT-9F3A1E", cameraId: "CAM-001", severity: "high", eventType: "loitering", confidence: 0.87, timestamp: iso(45_000), acknowledged: false, message: "Subject loitering > 180s near main entrance" },
  { alertId: "ALT-9F3A1B", cameraId: "CAM-012", severity: "high", eventType: "abandoned_object", confidence: 0.81, timestamp: iso(60_000), acknowledged: false, message: "Stationary bag detected — Garage B2 elevator bank" },
  { alertId: "ALT-9F3A18", cameraId: "CAM-005", severity: "medium", eventType: "ai_degraded", confidence: 0.62, timestamp: iso(95_000), acknowledged: false, message: "Inference latency exceeded SLA — fallback to motion-only" },
  { alertId: "ALT-9F3A15", cameraId: "CAM-003", severity: "medium", eventType: "crowd_density_spike", confidence: 0.79, timestamp: iso(180_000), acknowledged: false, message: "Crowd density +312% over baseline at Loading Dock B" },
  { alertId: "ALT-9F3A12", cameraId: "CAM-009", severity: "low", eventType: "tailgating", confidence: 0.71, timestamp: iso(240_000), acknowledged: true, message: "Possible tailgating — Stairwell B floor 3 access door" },
  { alertId: "ALT-9F3A0F", cameraId: "CAM-002", severity: "low", eventType: "vehicle_idle", confidence: 0.68, timestamp: iso(420_000), acknowledged: true, message: "Vehicle idle > 600s in restricted lane" },
  { alertId: "ALT-9F3A0C", cameraId: "CAM-007", severity: "low", eventType: "person_detected", confidence: 0.92, timestamp: iso(900_000), acknowledged: true, message: "Person detected in warehouse aisle 4 after-hours" },
];

const EVENT_TYPES = [
  "person_detected", "vehicle_detected", "license_plate_read", "loitering",
  "perimeter_breach", "crowd_density_spike", "abandoned_object", "tailgating",
  "running_detected", "fall_detected", "weapon_detected", "vehicle_idle",
];

export const MOCK_TIMELINE: TimelineEvent[] = Array.from({ length: 60 }, (_, i) => {
  const camera = MOCK_CAMERAS[i % MOCK_CAMERAS.length];
  const eventType = EVENT_TYPES[i % EVENT_TYPES.length];
  return {
    eventId: `EVT-${(0xa00000 + i).toString(16).toUpperCase()}`,
    cameraId: camera.cameraId,
    eventType,
    confidence: 0.55 + Math.random() * 0.44,
    timestamp: iso(i * 22_000 + Math.random() * 5000),
    metadata: {
      objectClass: eventType.includes("vehicle") ? "vehicle" : eventType.includes("person") || eventType.includes("loitering") ? "person" : "other",
      boundingBox: { x: Math.random() * 0.6, y: Math.random() * 0.6, w: 0.1 + Math.random() * 0.2, h: 0.15 + Math.random() * 0.25 },
      zone: ["restricted", "general", "perimeter", "vip"][i % 4],
      modelVersion: "yolo-v8m@2.1.4",
      inferenceMs: 18 + Math.floor(Math.random() * 22),
    },
  };
});

export const MOCK_SYSTEM_HEALTH: SystemHealth = {
  totalStreams: 12,
  activeStreams: 10,
  inferenceLatencyP95ms: 87,
  brokerLagMs: 14,
  criticalAlertCount: 1,
};

export const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
