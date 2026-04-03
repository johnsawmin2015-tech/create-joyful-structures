

## Plan: Theme Toggle, Enhanced Aesthetics, and 3D Floorplan View

The user requests three things: (1) dark/light theme toggle, (2) refined tactical glow/animation aesthetic, and (3) an interactive 3D floorplan with sensor overlays. Additionally, they want to verify the full end-to-end flow across all pages.

---

### 1. Dark/Light Theme Toggle

**Approach**: Use `next-themes` (already installed) with a `ThemeProvider` wrapping the app.

- **`src/components/ThemeProvider.tsx`** — Wrap `next-themes` `ThemeProvider` with `attribute="class"`, `defaultTheme="dark"`.
- **`src/index.css`** — Add a `.light` / `:root` (light mode) variable set alongside the existing dark variables. Light mode uses white/gray backgrounds with the same cyan/red/amber accent palette but adjusted for readability.
- **`src/components/ThemeToggle.tsx`** — A `Sun`/`Moon` icon button using `useTheme()` to toggle. Styled with a glow border on hover.
- **`src/components/DashboardLayout.tsx`** — Add `ThemeToggle` to the header bar next to `SidebarTrigger`.
- **`src/main.tsx`** — Wrap `<App />` in `<ThemeProvider>`.
- **`src/pages/Auth.tsx`** — Add `ThemeToggle` to the auth page corner.

---

### 2. Refined Tactical Aesthetic — More Glow & Animations

Enhance the existing dark-ops feel across the app:

- **`src/index.css`** — Add new utility classes:
  - `.glow-amber`, `.glow-green` (box-shadow variants)
  - `.animate-flicker` (subtle opacity flicker for status indicators)
  - `.animate-border-pulse` (border color pulse for active cards)
  - `.glass-panel` (backdrop-blur + semi-transparent bg for cards)
- **`tailwind.config.ts`** — Add `flicker`, `border-pulse`, `fade-in`, `scale-in` keyframes/animations.
- **`src/components/StatCard.tsx`** — Add `animate-fade-in` on mount, enhanced glow on hover, subtle inner border gradient.
- **`src/components/AppSidebar.tsx`** — Add animated cyan line indicator on active nav item; pulsing shield icon in header.
- **`src/components/DashboardLayout.tsx`** — Add a subtle animated scan-line across the header; frosted glass header.
- **All page headers** — Add `animate-fade-in` to page content containers for smooth page transitions.

---

### 3. Interactive 3D Floorplan View (New Page)

Since we can't use WebGL/Three.js easily without heavy deps, we'll build an **isometric 2.5D SVG/Canvas floorplan** that feels 3D using CSS transforms and layered SVG — lightweight, no extra dependencies.

- **`src/pages/FloorplanView.tsx`** — New page with:
  - **Isometric grid** rendered via CSS `transform: rotateX(60deg) rotateZ(-45deg)` on a container, giving a 3D perspective to a 2D SVG floor layout.
  - **Camera coverage cones** — SVG polygon overlays with cyan semi-transparent fills, positioned per camera's coordinates (from cameras table, with added `x`/`y`/`angle` fields or simulated).
  - **Live sensor dots** — Animated pulsing circles at sensor locations showing motion/door/temperature status.
  - **Historical incident heatmap** — SVG rect grid colored by detection density (from detections table), using a red-yellow gradient overlay with opacity based on count.
  - **Breach prediction zones** — Highlighted areas combining low-coverage + high-incident history, shown as pulsing amber zones with "Predicted Risk" labels.
  - **Interactive controls**: Click a camera cone to see its details; hover sensors for tooltips; toggle layers (cameras/sensors/heatmap/predictions) via toolbar.
  - **Floorplan layout**: A simulated building outline (conference rooms, corridors, entrance, parking) drawn with SVG paths.

- **Database migration** — Add a `floorplan_positions` table (`id`, `camera_id`, `x`, `y`, `angle`, `floor`) or simply use simulated positions keyed to existing camera IDs.

- **Seed data** — Position the 8 existing cameras on the floorplan with x/y/angle coordinates; generate ~50 historical incident points for the heatmap.

- **Route & nav** — Add `/floorplan` route in `App.tsx`, add "Floorplan" nav item with `Map` icon in `AppSidebar.tsx`.

---

### 4. End-to-End Verification

After implementation, navigate through every page (Auth → Dashboard → Live Monitor → Cameras → Alerts → Analytics → Forensic Search → AI Models → System Health → Floorplan) to verify rendering, data loading, and interactions.

---

### Technical Details

| Item | Approach |
|---|---|
| Theme system | `next-themes` with `class` strategy, CSS variable swap |
| Light palette | White bg `0 0% 100%`, gray cards `220 14% 96%`, same accent hues |
| 3D floorplan | CSS isometric transform + layered SVGs, no Three.js |
| Heatmap | Grid of SVG rects, opacity mapped to detection count per zone |
| Coverage cones | SVG polygons with `clip-path` or plain `<polygon>`, semi-transparent |
| Breach prediction | Algorithmic: zones with coverage gaps + high historical incidents |
| New table | `floorplan_positions` with camera_id, x, y, rotation, floor |
| New animations | CSS keyframes added to tailwind config |

### Files to Create/Modify

| File | Action |
|---|---|
| `src/components/ThemeProvider.tsx` | Create |
| `src/components/ThemeToggle.tsx` | Create |
| `src/pages/FloorplanView.tsx` | Create |
| `src/main.tsx` | Modify (wrap ThemeProvider) |
| `src/index.css` | Modify (light theme vars, new utilities) |
| `tailwind.config.ts` | Modify (new animations) |
| `src/components/DashboardLayout.tsx` | Modify (theme toggle, glass header) |
| `src/components/AppSidebar.tsx` | Modify (floorplan nav, active indicator) |
| `src/components/StatCard.tsx` | Modify (animations) |
| `src/App.tsx` | Modify (floorplan route) |
| `src/pages/Auth.tsx` | Modify (theme toggle) |
| Migration SQL | Create (floorplan_positions + seed) |

