# SENTINEL — System Architecture

Production-grade architecture for the AI-powered real-time surveillance & SOC platform.
Companion to the v0-built UI (`src/pages/Dashboard.tsx` + `src/components/sentinel/*`).

Hard SLOs the architecture is designed against:

| Metric | Target | Enforced at |
|---|---|---|
| Detection → UI alert latency | **p95 < 300 ms** | `inferenceLatencyP95ms` + broker lag dashboards |
| Concurrent live streams | **1 000+ per region** | Stateless workers + sharded Kafka topics |
| UI freshness | **≤ 1 s** | WebSocket fan-out, no polling |
| Tenant isolation | **Strict** | Per-tenant Kafka topic prefix + RLS + JWT claim |
| Availability | **99.9 % monthly** | Multi-AZ, no SPOF in any layer |

---

## 1. System architecture (textual diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EDGE / FIELD                                   │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                                 │
│  │ Camera   │   │ Camera   │   │ Edge     │  RTSP/H.265, WebRTC for low-lat │
│  │ (RTSP)   │   │ (WebRTC) │   │ Gateway  │  Edge GW: frame sample @ 5 fps  │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘  + JPEG/H.264 transcode + TLS   │
└───────┼──────────────┼──────────────┼──────────────────────────────────────┘
        │              │              │     mTLS, X.509 device certs
┌───────▼──────────────▼──────────────▼──────────────────────────────────────┐
│                       INGESTION LAYER (regional)                            │
│  ┌────────────────────────────┐    ┌────────────────────────────────────┐   │
│  │ Stream Ingress (Go)        │    │ Healthcheck / Heartbeat (Go)       │   │
│  │  - RTSP→RTP demux          │    │  - 5s ping, mark camera "degraded" │   │
│  │  - WebRTC SFU (Pion)       │    │    if 2 misses, "offline" if 6     │   │
│  │  - HLS recording → S3      │    └────────────────────────────────────┘   │
│  │  - Frame extractor → Kafka │                                             │
│  └────────────┬───────────────┘                                             │
└───────────────┼────────────────────────────────────────────────────────────┘
                │  topic: frames.{tenantId}.{shard}   key=cameraId
                │  partitions = #cameras / 8         retention=15 min
┌───────────────▼─────────────────────────────────────────────────────────────┐
│                       STREAM PROCESSING (k8s, autoscaled)                   │
│  ┌─────────────────────────┐   ┌─────────────────────────┐                  │
│  │ Inference Workers (Py)  │   │ Anomaly Workers         │                  │
│  │  - Triton / ONNX-RT GPU │   │  - rolling z-score      │                  │
│  │  - YOLO-class detect    │   │  - behavior models      │                  │
│  │  - emit detections      │   │  - emit anomalies       │                  │
│  └────────────┬────────────┘   └────────────┬────────────┘                  │
│               │                              │                              │
│               ▼   topic: detections.{tid}    ▼   topic: anomalies.{tid}     │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │ Correlation / Risk Engine (Rust)                            │            │
│  │  - dedup window 2 s    - rule engine (per-tenant config)    │            │
│  │  - per-camera risk score (decaying EWMA)                    │            │
│  │  - emits Alert (canonical shape) → topic alerts.{tid}       │            │
│  └────────────┬────────────────────────────────────────────────┘            │
└───────────────┼────────────────────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────────────────┐
│                            STORAGE LAYER                                    │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────────────┐  │
│  │ Redis (hot)  │  │ Postgres (cold)  │  │ S3 / object store             │  │
│  │  - last 15m  │  │  - alerts        │  │  - HLS clips (15 day TTL)     │  │
│  │  - dedup set │  │  - audit log     │  │  - thumbnails                 │  │
│  │  - presence  │  │  - tenant cfg    │  │  - signed URLs (5 min)        │  │
│  │    TTL 30s   │  │  - RLS by tid    │  │                               │  │
│  └──────────────┘  └──────────────────┘  └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                │                     │                     │
┌───────────────▼─────────────────────▼─────────────────────▼─────────────────┐
│                              API LAYER                                      │
│  ┌──────────────────────┐   ┌──────────────────────────────────────────┐    │
│  │ REST  (Node/Edge)    │   │ WebSocket Gateway (Go)                   │    │
│  │  GET /v1/cameras     │   │  wss://api.sentinel/v1/tenants/:tid/stream│   │
│  │  GET /v1/alerts      │   │  multiplexed channels: alerts, health,   │    │
│  │  POST /v1/ack        │   │     detections                           │    │
│  │  GET /v1/timeline    │   │  Kafka consumer per tenant               │    │
│  │  cursor pagination   │   │  100 K connections / pod (epoll)         │    │
│  └──────────────────────┘   └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │  TLS 1.3, JWT (RS256)
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                              SOC OPERATOR UI                                │
│       (Vite + React, this repo — Dashboard / LiveMonitor / Alerts)          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Layer-by-layer decisions

### Video ingestion
- **RTSP** for legacy cameras (PoE NVRs, fixed installs). The Stream Ingress demuxes RTP and pushes a sampled frame stream into Kafka.
- **WebRTC** for low-latency PTZ + smart cameras. Pion-based SFU; ICE/TURN behind LB.
- **Edge gateway** (optional, on-prem) does frame sampling (1–5 fps for inference, full-rate for HLS recording) and H.264 transcoding to cap upstream bandwidth at ~256 Kbps per camera.
- Each camera is provisioned with an X.509 device cert; ingress requires **mTLS**. Compromised cert revocable per-camera.

### Stream processing
- Inference workers run Triton with ONNX-RT or TensorRT engines on T4/L4 GPUs. Each pod handles ~32 streams at 5 fps.
- **Backpressure** is handled by Kafka consumer-group lag: when lag > 5 s the orchestrator scales out inference replicas (HPA on `kafka_consumer_lag` metric, not CPU). When lag is unrecoverable, the worker drops oldest frames and emits a `DEGRADED` health event for affected `cameraId`s — surfaced in the UI's `aiStatus` field as `"degraded"` or `"offline"`.
- **Correlation engine** (Rust, low GC) is the only stateful service. Keeps a 2 s sliding window per camera in Redis to dedupe and to compute the risk score (decaying EWMA: `risk_t = 0.85·risk_{t-1} + 0.15·event_severity`).

### Data & storage
- **Redis** (hot): last 15 min of detections + presence state; dedup set with `cameraId:eventType:roundedTs` keys (TTL 2 s). Cluster mode, 3-shard min.
- **Postgres** (cold): canonical alerts and audit log. **Row-level security** keyed on `tenant_id = current_setting('app.tenant_id')::uuid`, set per-request from JWT claim. Read replica for analytics.
- **Object store**: HLS clips as 6 s segments, 15-day TTL, lifecycle to Glacier after 30 days. UI receives **signed URLs** with 5-min expiry — UI never sees the raw bucket.

### API layer
- **REST** for CRUD and historical queries (cursor pagination, max page = 200, server-side severity/camera/event filters).
- **WebSocket gateway** is the realtime spine. Per-tenant fan-out from Kafka with a single consumer group per tenant, multiplexed onto active sockets. Channels: `alerts`, `health`, `detections`. Heartbeat every 30 s; client reconnects with `?since=<lastEventId>` and the gateway replays from the Redis ring buffer.

---

## 3. State & data flow

### WebSocket subscription model

```
  Client → CONNECT wss://…/v1/tenants/{tid}/stream?since=<lastEventId>
         ← {type:"hello", serverTime, sessionId}
  Client → {type:"subscribe", channel:"alerts", filters:{minSeverity:"medium"}}
         ← {type:"event", channel:"alerts", event:{Alert}, eventId}
         ← {type:"event", channel:"health", event:{SystemHealth}, eventId}
         ← {type:"ping", t}                       ← every 30 s
  Client → {type:"pong", t}                       ← within 10 s
```

Canonical shapes are the same as the UI's mock contract (`Alert`, `Camera`, `TimelineEvent`, `SystemHealth`) — defined once in `src/lib/sentinel-mock.ts`, mirrored server-side in protobuf.

### Synchronization strategy
- **Source of truth = server.** Client never invents IDs; ack flow is `POST /v1/alerts/:id/ack` → server emits `alert.updated` → client reconciles by `alertId`.
- **Sync-on-reconnect**: client tracks the last `eventId` per channel in memory (not localStorage — survives within session, deliberately drops on tab close). Reconnect sends `?since=<lastEventId>`; gateway replays from a Redis ring buffer (5 min retention). If `since` is older than retention, server responds `RESYNC_REQUIRED` and client refetches via REST.
- **In-memory store on the client**: React Query cache, key per tenant. WebSocket events `setQueryData` in place; no refetch storm.

### Stale data handling
- Each event carries `serverTime`; UI computes `age = now - serverTime`.
- Cameras whose last frame is > 10 s old are auto-flipped to `aiStatus: "degraded"`. > 30 s = `"offline"`.
- The system-health strip shows `lastUpdate` and the WebSocket badge (`live | reconnecting | offline`).
- If reconnecting > 5 s, an inline banner appears: *"Reconnecting — you are viewing data from {{age}} ago."*

### Dropped connections
- Exponential backoff: 1, 2, 4, 8, 16, 30 s (cap).
- After 3 failures, fall back to **REST polling at 5 s** with a degraded-mode banner.
- After 10 failures, surface a hard error toast and stop attempting.

### Delayed AI results
- Detections older than the dedup window are dropped with a `DROPPED_LATE` audit event.
- If inference latency p95 crosses 250 ms (mid-amber) the SystemHealthWidget shifts to amber; > 400 ms (red) and the orchestrator triggers an inference scale-out.

---

## 4. Failure & edge cases

| Failure | UX state | System behavior |
|---|---|---|
| **Camera offline** | Card switches to offline state: muted thumbnail, `last seen Xm ago`, reconnect attempt counter, no AI overlay. | Heartbeat 6× missed → emit `camera.offline`; auto-attempt RTSP reconnect with backoff; keep slot, do not remove. |
| **AI inference failure** | Card shows `aiStatus: "offline"` chip; bounding boxes hidden; risk score frozen with timestamp. | Worker liveness probe fails → pod restart; Kafka lag re-routes to healthy replicas. UI risk score capped at last known value. |
| **Network degradation (UI)** | Top-bar WS indicator goes amber → red; banner *"Reconnecting…"*; falls back to REST polling. | Backoff reconnect; eventId-based replay on success. |
| **Alert duplication** | UI dedupes by `alertId`; React Query `setQueryData` is idempotent. | Server dedups by `(cameraId, eventType, ⌊ts/2s⌋)` in Redis with TTL 2 s. Same key = drop. |
| **Data inconsistency** | If `health.criticalAlertCount` ≠ derived count from alert list, UI **always trusts the derived count** (we removed the duplicated state per feedback rule). | Background reconciliation job every 60 s normalizes Postgres against the Kafka log. |
| **Operator double-ack race** | Ack button optimistic; if server returns 409 (already acked by another operator), UI rolls back and shows toast *"Already acknowledged by {{user}}"*. | `UPDATE alerts SET acknowledged=true WHERE id=$1 AND acknowledged=false` with `RETURNING` — empty result = race. |

---

## 5. Intelligence layer

- **Risk score per camera**: `R = 0.85·R_prev + 0.15·max_event_severity` per 2 s tick. Surfaced via `RiskScoreIndicator` (full and compact variants).
- **Behavioral anomaly**: rolling 30 min baseline of detection density per camera; z-score > 2.5 emits `behavior_anomaly` event with the deviation in `metadata`.
- **Heatmap**: detections aggregated to a 64×36 cell grid per camera per 1 min, served via `GET /v1/cameras/:id/heatmap?from&to`. Renders in the FloorplanView page.
- **Predictive alert**: when `R` is in the upper quartile *and* trending up across 5 ticks, emit a `predictive` alert one severity tier below the trigger threshold, with confidence proportional to the slope. Operators can ack or escalate.

---

## 6. Security model

### Authentication
- **JWT (RS256)**, 15 min access token, 24 h refresh. Tokens are issued by an OIDC IdP (Auth0/Okta/Supabase Auth — current code uses Supabase Auth).
- Token claims: `sub`, `tenant_id`, `roles[]`, `exp`, `iat`, `jti`.
- WebSocket auth: token passed as `Sec-WebSocket-Protocol` header (not query string — query strings leak in logs). Re-validated every 60 s; expired token → soft disconnect with reconnect hint.

### Authorization (RBAC)
Three primary roles with strict capability boundaries:

| Capability | Viewer | Operator | Admin |
|---|:-:|:-:|:-:|
| View live streams | ✓ | ✓ | ✓ |
| Acknowledge alerts | – | ✓ | ✓ |
| Bulk-ack / mute alerts | – | ✓ | ✓ |
| Configure cameras | – | – | ✓ |
| Manage users / roles | – | – | ✓ |
| Export forensic clips | – | ✓ (audit) | ✓ |

Enforcement is **server-side only**; the UI hides the controls for UX but a forged request from a Viewer fails at the API with 403. Postgres `has_role(uid, role, tenant)` function gates row updates.

### Multi-tenant isolation
- **Network**: tenant traffic does not cross VPCs; ingress LB routes by subdomain `{tenant}.api.sentinel`.
- **Data**: every table has `tenant_id NOT NULL`; **RLS** policies enforce `tenant_id = current_setting('app.tenant_id')::uuid`. The connection pool sets it per request from the JWT.
- **Kafka**: per-tenant topic prefix `*.{tenantId}.*`; consumer groups scoped per tenant; no cross-tenant consumers.
- **Object storage**: per-tenant prefix `s3://sentinel/{tenantId}/...`; signed URLs cannot cross prefixes.

### Transport
- **TLS 1.3** everywhere; HSTS preload; mTLS at the ingestion edge.
- WebSockets only over `wss://`. No fallback to `ws://`.
- Outbound webhooks signed with HMAC-SHA256 on a per-tenant secret.

### Audit
- Every state-changing API call writes an immutable row in `audit_log` (append-only, retained 7 years). UI surfaces this in the Admin → Audit page.

### Secrets & key management
- All secrets in cloud KMS (AWS KMS / GCP KMS); rotation every 90 days.
- Camera device certs rotated yearly; CRL distributed to ingress.

---

## 7. Operational concerns (out-of-band but expected)

- **Observability**: OpenTelemetry traces from browser through gateway → Kafka → workers; one trace per detection. Prometheus metrics on every layer (lag, latency, error rate). Grafana dashboards mirror the `SystemHealthWidget`.
- **SLO**: 99.9 % monthly availability per region; alert latency p95 < 300 ms is a hard burn-rate alert.
- **Disaster recovery**: Postgres PITR + cross-region replica; S3 cross-region replication; Kafka MirrorMaker between two regions for active-active read.
- **Cost guardrails**: inference workers scale on Kafka lag, not CPU, to avoid runaway GPU spend; HLS recording moves to Glacier after 30 days.

---

## 8. UI ↔ backend contract surface (at a glance)

```ts
// src/lib/sentinel-mock.ts — same shapes the server emits
type Camera        = { cameraId; label; location; streamUrl; status; riskScore; lastAlert; aiStatus };
type Alert         = { alertId; cameraId; severity; eventType; confidence; timestamp; acknowledged; message? };
type TimelineEvent = { eventId; cameraId; eventType; confidence; timestamp; metadata };
type SystemHealth  = { totalStreams; activeStreams; inferenceLatencyP95ms; brokerLagMs; criticalAlertCount; lastUpdate };
```

When the real backend is wired, swap the `setInterval` in `Dashboard.tsx` for a single hook `useSentinelStream(tenantId)` that opens the WS, replays since the last `eventId`, and writes into React Query — no other call site needs to change because the canonical shapes are identical.
