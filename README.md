# Portfolio (Cloudflare Workers)

A minimal, data-driven personal portfolio site served by a Cloudflare Worker.

## Overview

This project combines:

- **Static frontend assets** in `public/` (HTML/CSS/JS and JSON content).
- **A Worker backend** in `src/worker.js` for dynamic stats and visit tracking.
- **Cloudflare D1** for visitor analytics storage.

At runtime, the Worker serves static files through the `ASSETS` binding and exposes lightweight JSON APIs under `/api/*`.

## Architecture

### Frontend (`public/`)

- `index.html` defines section containers (education, experience, stats, projects, leadership, contact).
- `public/js/main.js` initializes theme, entries, remote stats, visit tracking, GitHub heatmap, and interactive globe.
- Content is loaded from JSON files (`education.json`, `experience.json`, `projects.json`, etc.) and rendered client-side.
- Entry-type JSON records (e.g., education/experience) can optionally include `startDate` (ISO date string). When `startDate` is in the future, the UI automatically labels the item as `Incoming`.

### Backend (`src/worker.js`)

The Worker provides three API routes:

- `POST /api/visit` — records a page visit (path + geo/IP metadata from Cloudflare request context).
- `GET /api/visit-stats` — returns total visits, unique visitors, and aggregated map points.
- `GET /api/stats` — fetches LeetCode + Monkeytype stats and returns a unified payload.

All non-API requests are forwarded to static assets via `env.ASSETS.fetch(request)`.

### Data layer (D1)

- SQL schema lives in `migrations/0001_visits.sql`.
- `visits` stores timestamp, path, IP, and location fields used for aggregate analytics and globe markers.

## Configuration

`wrangler.toml` configures:

- Worker entrypoint (`src/worker.js`)
- Compatibility date
- Static assets binding (`[assets]`)
- Build hook (`scripts/sync-shared-monkeytype.mjs`)
- D1 binding (`DB`)

## Local development

### Prerequisites

- Node.js (for build script tooling)
- Wrangler CLI
- Cloudflare account/project setup

### Run locally

```bash
npm install
npx wrangler dev
```

If this repository is used without a full npm setup, run Wrangler directly as configured in your environment.

## Deploy

```bash
npx wrangler deploy
```

## Notes

- Monkeytype parsing logic is shared across Worker and frontend via `src/shared/monkeytype.js` and synced into `public/js/shared/` during build.
- Stats endpoints are resilient: frontend falls back gracefully when external APIs are unavailable.
