# SENTINEL

A React and TypeScript security-operations dashboard prototype for exploring camera monitoring, alert triage, detection analytics, and Supabase-backed operational workflows.

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.x-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)

> [!IMPORTANT]
> SENTINEL is currently a frontend-focused MVP and demonstration environment. Authentication and selected records are backed by Supabase, while video feeds, detection overlays, infrastructure telemetry, model deployments, and several dashboard metrics are simulated or static. This repository does not contain a camera-ingestion pipeline or a production ML inference backend.

## Overview

SENTINEL presents a security operations center interface with protected routes, camera and incident management, interactive monitoring views, analytics, forensic filtering, and a visual floorplan. The application combines live Supabase queries with purpose-built mock data so the interface remains demonstrable without a complete surveillance backend.

## Features

- Email and password sign-up and sign-in through Supabase Auth
- Protected application routes with persistent browser sessions
- Command dashboard with camera cards, risk indicators, priority alerts, system-health summaries, and an event timeline
- Camera management backed by Supabase, including creation, deletion, status filtering, and stream metadata
- Live-monitor grid with search, status filters, multiple layouts, fullscreen views, simulated object boxes, motion trails, zones, night vision, snapshot feedback, and PTZ controls
- Incident center with severity and acknowledgement filters, single or bulk acknowledgement, and Supabase Realtime refreshes
- Analytics views for detections, alerts, severity, confidence, activity patterns, lifecycle stages, and camera correlation
- CSV export for selected analytics datasets
- Forensic detection filtering by object type, camera, and minimum confidence
- Interactive floorplan with camera coverage, sensors, heatmap layers, and demonstration risk zones
- Reference model catalog and system-health dashboards
- Responsive sidebar navigation, light/dark themes, toasts, tooltips, and keyboard shortcuts

## Implementation Status

| Area | Current data source |
| --- | --- |
| Authentication | Supabase Auth |
| Camera inventory and management | Supabase `cameras` table |
| Incident list and acknowledgement | Supabase `alerts` table |
| Alert refresh | Supabase Realtime subscription |
| Detection and forensic views | Supabase `detections` table |
| User directory and roles | Supabase `profiles` and `user_roles` tables |
| Command dashboard | Local mock data with simulated updates |
| Live video and object overlays | Database camera metadata plus demonstration feeds and simulated detections |
| Analytics | Supabase records when present; generated demonstration data when empty |
| Floorplan, risk zones, and sensors | Static demonstration configuration |
| AI model deployment and pipeline metrics | Static reference catalog |
| Service, GPU, broker, and storage health | Static or simulated telemetry |

## Tech Stack

- React 18
- TypeScript
- Vite with the React SWC plugin
- React Router
- TanStack Query
- Supabase Auth, PostgreSQL, Row Level Security, and Realtime
- Tailwind CSS
- Radix UI primitives and shadcn/ui-style components
- Recharts
- React Hook Form and Zod
- Lucide React
- Vitest, Testing Library, and ESLint

## Getting Started

### Prerequisites

- Git
- Node.js and npm
- A Supabase project for authentication and database-backed features

### Installation

```bash
git clone https://github.com/johnsawmin2015-tech/create-joyful-structures.git
cd create-joyful-structures
npm ci
```

### Configure Supabase

Create a `.env.local` file in the repository root:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Only these two variables are read by the current application source.

Apply the schema in [`supabase/migrations`](supabase/migrations) to the target Supabase project before using database-backed screens. The migration creates:

- `profiles`
- `user_roles`
- `cameras`
- `alerts`
- `detections`
- `system_settings`

It also enables Row Level Security, defines `admin`, `operator`, and `viewer` roles, creates new-user profile handling, and adds `alerts` to Supabase Realtime.

> [!NOTE]
> The checked-in `.env.example` currently names `VITE_SUPABASE_ANON_KEY`, but the application reads `VITE_SUPABASE_PUBLISHABLE_KEY`. Use the variable shown above unless the client implementation is changed.

### Start Development

```bash
npm run dev
```

The configured development server runs at [http://localhost:8080](http://localhost:8080).

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run build:dev` | Build using Vite's development mode |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the project |
| `npm run test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |

## Project Structure

```text
.
├── public/                         # Static assets
├── src/
│   ├── components/
│   │   ├── sentinel/               # Domain-specific dashboard components
│   │   └── ui/                     # Reusable UI primitives
│   ├── hooks/                      # Authentication and UI hooks
│   ├── integrations/supabase/      # Generated client and database types
│   ├── lib/                        # Mock domain data and shared utilities
│   ├── pages/                      # Routed application screens
│   ├── test/                       # Vitest setup and tests
│   ├── App.tsx                     # Providers and route definitions
│   ├── index.css                   # Global theme and Tailwind styles
│   └── main.tsx                    # Browser entry point
├── supabase/                       # Supabase config, schema, and policies
├── components.json                 # shadcn/ui configuration
├── tailwind.config.ts              # Theme and design tokens
├── vite.config.ts                  # Vite configuration
└── vitest.config.ts                # Unit-test configuration
```

## Application Routes

| Route | Purpose |
| --- | --- |
| `/auth` | Sign in or create an account |
| `/dashboard` | Operational command dashboard |
| `/live-monitor` | Multi-camera monitoring grid |
| `/cameras` | Camera inventory and configuration |
| `/floorplan` | Interactive building visualization |
| `/alerts` | Incident triage and acknowledgement |
| `/analytics` | Detection and alert analytics |
| `/forensic-search` | Detection and related-alert filtering |
| `/ai-models` | Reference AI model catalog |
| `/system-health` | Demonstration infrastructure telemetry |
| `/users` | Supabase profile and role directory |
| `/settings` | Static platform status and roadmap targets |

All operational routes are protected by Supabase session checks.

## Quality Checks

Before opening a pull request, run:

```bash
npm run lint
npm run test
npm run build
```

The current Vitest suite contains only a placeholder smoke test. Playwright configuration files are present, but end-to-end testing is not wired into `package.json`, and the referenced `lovable-agent-playwright-config` package is not declared as a dependency.

## Deployment

Build the static application with:

```bash
npm run build
```

Vite writes the deployable output to `dist/`.

A hosting platform must provide:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- A single-page application fallback that rewrites unknown routes to `index.html`

No provider-specific deployment or CI configuration is currently included in this repository.

## Current Limitations

- No RTSP ingestion, FFmpeg processing, recording service, or playable camera stream is implemented.
- No ML model runtime, inference service, model deployment workflow, or alert-generation pipeline is included.
- Dashboard streams, bounding boxes, health values, risk indicators, notifications, and parts of analytics use mock or randomly generated data.
- The model manager stores camera assignments only in component state.
- The floorplan, sensors, heatmap, and breach zones are demonstration visualizations.
- The displayed application role is currently hard-coded to `operator`; database roles are not yet connected to the navigation UI.
- The forensic License Plate input only narrows results to `license_plate` detections; it does not match entered plate text against stored metadata.
- The repository currently tracks a configured `.env` file. Before using the project as a template, move deployment-specific values to local or provider-managed environment settings, stop tracking that file, and rotate any credential not intended for public use.
- Automated end-to-end coverage and CI gates are not currently available.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the local setup, branch, commit, test, and pull-request guidelines.

## License

No license file is currently included. Until a license is added, reuse and redistribution are not granted automatically.
