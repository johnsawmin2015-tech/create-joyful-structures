<!--
  Modern README for Create Joyful Structures
  Updated: 2026-04-24
-->

```markdown
# Create Joyful Structures • v1.0.0

[![Status](https://img.shields.io/badge/status-active-brightgreen.svg)](https://github.com/johnsawmin2015-tech/create-joyful-structures)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Built with Vite](https://img.shields.io/badge/built%20with-Vite-blue.svg)](https://vitejs.dev)
[![React](https://img.shields.io/badge/react-18.x-%2361DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org)

A modern starter kit and design system for building delightful web apps. Fast development with Vite + React, type-safe code with TypeScript, and expressive UI using TailwindCSS + Radix + shadcn patterns.

---

Table of Contents
- [Why this project](#why-this-project)
- [Quick start](#quick-start)
- [Features](#features)
- [Project layout](#project-layout)
- [Environment variables](#environment-variables)
- [Development workflow](#development-workflow)
- [Upgrading dependencies](#upgrading-dependencies)
- [Testing & CI](#testing--ci)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Roadmap & changelog](#roadmap--changelog)
- [License](#license)

---

Why this project
----------------

Create Joyful Structures is a pragmatic starter focused on developer experience and composable UI:
- Quick to scaffold and iterate with Vite and Tailwind.
- Type-safety and clear boundaries using TypeScript and modular directories.
- Accessible, reusable primitives via Radix and shadcn-style components.
- Batteries included: testing (Vitest + Playwright), linting, and CI-friendly configs.

Quick start
-----------

Clone and install:

```bash
git clone https://github.com/johnsawmin2015-tech/create-joyful-structures.git
cd create-joyful-structures
# Install with Bun (recommended), npm or pnpm
bun install
# or
npm install
# or
pnpm install
```

Run the dev server:

```bash
# Bun
bun run dev
# npm
npm run dev
# pnpm
pnpm dev
```

Open http://localhost:5173

Production build:

```bash
npm run build
npm run preview
```

Features
--------

- Vite + React + TypeScript starter
- TailwindCSS with animation utilities
- Radix UI primitives + shadcn patterns
- React Query for server state
- Supabase helpers (preconfigured folder for integration)
- Vitest unit tests + Playwright E2E fixtures
- ESLint and opinionated linting config
- Ready for deployment to Vercel, Netlify, or static hosts

Project layout
--------------

```
.
├─ public/                # Static assets
├─ src/
│  ├─ main.tsx            # App bootstrap
│  ├─ App.tsx             # Root application component
│  ├─ index.css / App.css # Tailwind + global styles
│  ├─ components/         # Reusable UI components (shadcn style)
│  ├─ hooks/              # Custom React hooks
│  ├─ integrations/       # API & third-party integration code (e.g. supabase)
│  ├─ lib/                # Utilities, helpers, types
│  └─ pages/              # Route/page components
├─ supabase/              # Supabase configuration (if used)
├─ vite.config.ts
├─ tailwind.config.ts
├─ package.json
└─ README.md
```

Environment variables
---------------------

Copy and populate `.env` from your environment or `.env.example` (if present):

```
# example
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=public-anon-key
```

Note: Vite exposes variables prefixed with `VITE_` to the client.

Development workflow
--------------------

- Use feature branches with descriptive names: `feat/auth-signup`, `fix/navbar-a11y`.
- Commit messages: Use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`) to make changelogs and releases predictable.
- Previews: Use `npm run build` + `npm run preview` to verify production output locally.

Upgrading dependencies
----------------------

Keep dependencies fresh for security and performance:

- Bun: `bun upgrade --latest`
- npm: `npm outdated` and `npm update` (or use `npm install pkg@latest` for specific package)
- pnpm: `pnpm up --latest`

Consider running `npx npm-check-updates -u` to bump package.json ranges and then reinstall.

Testing & CI
------------

- Unit tests: Vitest (`npm run test`) — fast, Vite-native.
- End-to-end: Playwright (`@playwright/test`) for cross-browser E2E testing.

Example GitHub Actions (suggestion):

- Run lint, test, and build on PRs
- Publish preview deployments on push to `main` or `deploy/*` branches

Deployment
----------

Works out-of-the-box with static hosts such as Vercel or Netlify (set `build` command to `vite build`).

- Vercel: Connect the repo, set framework to `vite`, and add any VITE_* env vars.
- Netlify: Use `npm run build` as the build command and `dist` as the publish directory.

Contributing
------------

Contributions are welcome. Suggested workflow:
1. Fork the repo and create a feature branch.
2. Follow the existing code style and lint rules.
3. Add tests for new behavior.
4. Open a pull request with a clear description and linked issue (if any).

If you want a CONTRIBUTING.md or PR template, I can add one.

Roadmap & changelog
-------------------

Planned enhancements:
- Component gallery / Storybook-style preview
- CI previews & automated dependency updates via Dependabot
- Docker / containerized dev environment

Changelog: use tags + GitHub releases. Semantic versioning recommended (MAJOR.MINOR.PATCH).

License
-------

This repository is shipped as-is for learning and prototyping. Add a LICENSE file (MIT recommended) if you want to open-source it.

---

Maintainers
-----------

- John Saw Min — https://github.com/johnsawmin2015-tech

---

If you'd like I can:
- add CI config for GitHub Actions,
- add a CONTRIBUTING.md and PR templates,
- add badges (test coverage, pipeline),
- generate a sample `.env.example`, or
- produce a one-page architecture diagram.

```
