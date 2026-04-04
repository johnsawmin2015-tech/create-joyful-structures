

## Plan: Advanced Dashboard, Live Monitor & Analytics + Demo Camera Units

### Overview
Massively upgrade the three core pages to feel like a world-class security command center, and add hardcoded demo camera units so Live Monitor always has feeds to display even without database data.

---

### 1. Dashboard — Command Center Overhaul

**Current state**: 4 stat cards, 1 sparkline chart, 1 infrastructure panel, recent alerts list, camera fleet list.

**Upgrades**:
- **Animated threat level ring** — Replace the text-only threat badge with an animated SVG radial gauge (green/amber/red arc) showing real-time threat score
- **Live activity ticker** — Horizontal scrolling ticker bar at the top showing the latest detection events in real-time (monospaced, cyan text)
- **World clock / uptime counter** — Running uptime timer with millisecond precision in the header
- **Enhanced stat cards** — Add animated sparkline mini-charts inside each stat card (tiny inline SVG), plus percentage change indicators with up/down arrows
- **Detection heatmap grid** — A new 24h × 7-day grid heatmap (like GitHub contributions) showing detection density per hour, colored cyan→amber→red
- **Camera health matrix** — Replace the simple list with a grid of camera tiles showing colored status dots with live ping latency values
- **Real-time event log** — A scrollable terminal-style log panel with monospaced text, timestamp prefixes, and color-coded severity (like a security operations center console)
- **Network topology mini-map** — Small SVG showing connected services/cameras as nodes with animated connection lines

### 2. Live Monitor — Advanced Surveillance Grid

**Current state**: Grid layout selector, simulated bounding boxes, basic HUD overlay.

**Add 12 hardcoded demo camera units** that render even when the database is empty:
```
CAM-01: Main Entrance (online)     CAM-07: Server Room (online)
CAM-02: Parking Lot A (online)     CAM-08: Rooftop (online)  
CAM-03: Loading Dock (online)      CAM-09: Stairwell B (offline)
CAM-04: Lobby (online)             CAM-10: Emergency Exit (error)
CAM-05: Corridor East (online)     CAM-11: Warehouse (online)
CAM-06: Perimeter North (online)   CAM-12: Reception (online)
```

**Enhanced feed simulation**:
- **Smooth bounding box interpolation** — Lerp box positions between frames instead of jumping (requestAnimationFrame-based)
- **Motion trails** — Fading ghost trail behind moving bounding boxes (3-frame history with decreasing opacity)
- **Zone overlay toggle** — Button to show/hide virtual tripwire lines and restricted zone polygons drawn as colored SVG overlays on each feed
- **Per-camera event ticker** — Small scrolling text at the bottom of each feed showing recent detections for that camera
- **Recording indicator** — Pulsing red "REC" dot with duration timer in the top-right corner
- **PTZ control panel** — On hover/click, show directional arrows (pan left/right/up/down) and zoom +/- buttons (simulated, visual only)
- **Audio level meter** — Tiny animated bar meter showing simulated audio levels
- **Snapshot button** — Camera icon button that triggers a brief flash animation
- **Night vision toggle** — Button that applies a green-tinted CSS filter to simulate IR mode
- **Connection quality bar** — 4-bar signal strength indicator per camera
- **Toolbar enhancements** — Add filter by status (online/offline/all), search cameras by name, and a "theater mode" button that hides the sidebar

### 3. Analytics — Intelligence Hub Overhaul

**Current state**: 4 summary stats, 5 charts (timeline, pie, bar, horizontal bar, confidence histogram).

**Upgrades**:
- **Radar chart** — Multi-axis radar showing detection performance across object types (accuracy, count, avg confidence)
- **Treemap chart** — Detection distribution by camera + object type as a nested treemap
- **Funnel chart** — Alert lifecycle funnel: Detected → Alerted → Acknowledged → Resolved
- **Correlation scatter plot** — Confidence vs detection count per camera, bubble size = alert count
- **Time-of-day pattern chart** — Radial/polar chart showing detection patterns by hour (clock-shaped)
- **Comparative period selector** — Toggle between "Last 24h", "Last 7 days", "Last 30 days" with animated chart transitions
- **KPI trend indicators** — Each summary stat gets a trend arrow with percentage change vs. previous period
- **Export buttons** — CSV download for each chart's underlying data
- **Live updating counters** — Detection/alert counts animate (count up effect) on page load

---

### Technical Details

| Item | Approach |
|---|---|
| Demo cameras | Hardcoded array of 12 units merged with DB cameras (DB takes priority by name) |
| Smooth bbox | `requestAnimationFrame` + linear interpolation between target positions |
| Motion trails | Array of 3 previous positions rendered with opacity 0.6/0.3/0.1 |
| Heatmap grid | CSS Grid of small divs, colored via inline style based on count |
| Radar chart | Recharts `RadarChart` component |
| Treemap | Recharts `Treemap` component |
| Count-up animation | Custom hook with `requestAnimationFrame` incrementing from 0 to target |
| Night vision | CSS `filter: hue-rotate(80deg) saturate(3) brightness(0.7)` toggle |
| PTZ controls | Absolute-positioned arrow buttons, visual only |
| Activity ticker | CSS `@keyframes` horizontal scroll animation on a flex container |

### Files to Modify

| File | Changes |
|---|---|
| `src/pages/Dashboard.tsx` | Full rewrite — threat gauge, heatmap grid, event log, network mini-map, enhanced stats |
| `src/pages/LiveMonitor.tsx` | Full rewrite — 12 demo units, smooth bbox, motion trails, PTZ, zones, night vision, theater mode |
| `src/pages/Analytics.tsx` | Full rewrite — radar, treemap, funnel, scatter, polar, period selector, export, count-up |
| `src/index.css` | New utility classes for night-vision filter, ticker scroll, recording indicator |
| `tailwind.config.ts` | New keyframes for ticker-scroll, count-up |

