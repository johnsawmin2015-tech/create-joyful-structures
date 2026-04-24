# Create Joyful Structures

A modern, full-featured web application starter built with Vite, React, TypeScript, TailwindCSS, and a rich component library. This project is designed to help you rapidly build scalable, maintainable, and beautiful user interfaces, integrating state-of-the-art tooling for testing, API, and backend development.

---

## Features

- ⚡️ Vite for instant development & lightning-fast builds
- ⚛️ React + TypeScript application structure
- 💅 TailwindCSS for utility-first styling and rapid UI prototyping
- 🎛️ ShadCN/UI and Radix-UI React component integration
- 🔄 React Query for powerful, declarative data fetching and mutation
- 📦 Modular "src/" directory for easy scaling (components, hooks, pages, integrations, libs, tests)
- 🧪 Comprehensive testing setup (Vitest & Playwright)
- 🔒 Supabase integration for backend and authentication solutions
- 🧹 Strict linting, formatting, and code-quality tools (ESLint, etc.)

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Bun or npm/yarn/pnpm for package management

### Install Dependencies

```bash
bun install         # Or use npm install/yarn/pnpm install
```

### Running the Dev Server

```bash
bun run dev         # Or npm run dev
```

App will be available at `http://localhost:5173` by default.

### Building for Production

```bash
bun run build
```

### Running Tests

```bash
bun run test        # Runs Vitest unit tests
bun run test:watch  # Runs tests in watch mode
```

### Linting

```bash
bun run lint
```

---

## Project Structure

```
src/
  App.tsx            # Main React root component
  App.css, index.css # Styling entry points
  main.tsx           # App bootstrap and mounting
  components/        # Reusable UI components
  hooks/             # Custom React hooks
  integrations/      # Third party/API logic
  lib/               # Shared internal utilities and logic
  pages/             # App views/routing targets
  test/              # Unit/integration/E2E tests
  vite-env.d.ts      # Vite global env types
public/              # Static assets
supabase/            # Supabase backend config/assets
```

---

## Environment Variables

Copy `.env.example` to `.env` and add your configuration (API keys, backend URLs, etc.)

---

## Tooling & Scripts

- **Development:** Vite, React Fast Refresh
- **Testing:** Vitest, Playwright, React Testing Library
- **Linting:** ESLint (`bun run lint`)
- **Build:** Vite, TypeScript
- **Styling:** TailwindCSS, PostCSS, Tailwind-merge, tailwindcss-animate
- **Component Library:** ShadCN/UI, Radix-UI, Lucide-react icons

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change, or contact the project maintainer.

---

## License

This project is for learning and experimentation. Licensing TBD.

---

## Acknowledgements

- [Vite](https://vitejs.dev)
- [React](https://react.dev)
- [TailwindCSS](https://tailwindcss.com)
- [Supabase](https://supabase.com)
- [Radix UI](https://www.radix-ui.com/)
- [ShadCN/UI](https://ui.shadcn.com/)
- [Vitest](https://vitest.dev)
- [Playwright](https://playwright.dev)
