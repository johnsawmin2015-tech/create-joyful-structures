# Contributing to Create Joyful Structures

Thanks for your interest in contributing! This document outlines a lightweight workflow and expectations so contributions stay consistent and reviewable.

Table of contents
- How to contribute
- Development setup
- Branching and commit message style
- Code style and linting
- Tests
- Reporting security issues

How to contribute

1. Fork the repository and create a feature branch from main (or the default branch):

```bash
git checkout -b feat/your-feature
```

2. Make your changes in a focused commit(s). Keep changes small and descriptive.

3. Run lint and tests locally before opening a PR:

```bash
npm run lint
npm run test
```

4. Push your branch and open a Pull Request against the `main` branch. Describe the change, the motivation, and any relevant screenshots or links.

Development setup

1. Clone the repo:

```bash
git clone https://github.com/johnsawmin2015-tech/create-joyful-structures.git
cd create-joyful-structures
```

2. Install dependencies:

```bash
# Bun (recommended)
bun install
# or npm
npm install
```

3. Run the dev server:

```bash
npm run dev
```

Branching and commit message style

- Use short, descriptive branch names: `feat/login`, `fix/navbar-a11y`, `chore/deps`.
- Use Conventional Commits for commit messages: `feat:`, `fix:`, `chore:`, `docs:`. This enables clean changelogs and release automation.

Code style and linting

- The project uses ESLint and TypeScript. Please run `npm run lint` and follow the autofix suggestions when possible.
- Prefer small, focused PRs. Add unit or integration tests for new behavior.

Tests

- Unit tests: `npm run test` (Vitest)
- E2E tests: Playwright fixtures are included; setup and run with `npm run test:e2e` if added to the project scripts.

Security and reporting

If you discover a security vulnerability, please do not open a public issue. Instead, contact the repository owner directly at johnsawmin2015@gmail.com to coordinate disclosure.

Thanks for helping make this project better!