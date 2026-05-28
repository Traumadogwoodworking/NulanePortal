# Control Console

Fresh, registry-first control plane for docudent automation, observability, and admin workflows.

## Overview

This standalone Next.js app targets operators and automation engineers. It is intentionally small, modular, and built for the App Router, Tailwind, and future automation/AI surfaces.

## Getting started

1. `cd control-console`
2. `npm install` (network access is required to bootstrap dependencies)
3. `npm run dev`
4. Visit `http://localhost:3000/admin/control`

> Environment hints: set `CONTROL_PLANE_API_BASE_URL` to point at the backend control plane, and provide `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `CONTROL_CONSOLE_REDIRECT_URI` for Auth0 readiness. Use `CONTROL_CONSOLE_ADMIN_EMAILS` (comma separated) to seed admins during early testing.

## Architecture

- **App layout:** `app/layout.tsx` wraps pages with `AdminShell`, which surfaces the navigation and nav summary derived from the registry.
- **Registry-driven surfaces:** `lib/registry` hosts `ControlSurfaceRegistry` and a self-registering `registerDefaultSurfaces` helper. Each surface exports a `ControlSurfaceDefinition` that includes metadata and a render function (§ components/surfaces).
- **Services:** `lib/services/controlConsoleClient.ts` centralizes backend requests, handles fallbacks, and keeps HTTP concerns in one place.
- **Auth stubs:** `lib/auth/auth0.ts` codifies the environment names and helper guards that will be wired to Auth0 (or `@auth0/nextjs-auth0`) later.
- **UI primitives:** `components/ui` houses composable cards, badges, metric grids, and buttons so surfaces stay focused on data and layout.

## Folder expectations

```
control-console/
├── app/                 Next.js App Router entrypoints (landing page + admin paths)
├── components/          Layout shell, reusable UI atoms, and surface definitions
├── lib/
│   ├── auth/            Auth0 helpers and session guards
│   ├── registry/        Registry implementation and surface registration bootstrapping
│   ├── services/         APIs for control-plane telemetry and blueprint data
│   └── types/           Shared TypeScript interfaces
├── styles/              Tailwind globals
├── package.json         Scripts and dependency declarations
└── tailwind.config.ts   Tailwind 4 configuration
```

## Running guidance

- Use `npm run dev` while pointing `.env.local` to the target backend.
- Add new ControlSurfaceDefinition exports under `components/surfaces` and register them via `lib/registry/registerDefaultSurfaces.ts` to keep the shell fully registry-driven.
- Tailwind 4 is configured in `tailwind.config.ts`; run `npm run lint` to keep formatting and linting tidy.

## Editing guidance

- Inspect the active surface before editing it.
- Keep changes small and local unless a larger change is required by the current behavior.
- Prefer obvious code paths over layered abstractions.
- Centralize style only when the source of truth is clear and the change is safe.
- Preserve existing behavior when the task is a simplification, not a redesign.
