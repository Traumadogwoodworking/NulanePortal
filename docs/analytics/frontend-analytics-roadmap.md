# Frontend Analytics Roadmap

## What We Are Building

A lightweight embedded analytics framework inside Next.js:

- dashboard pages
- shared filters
- reusable cards/charts
- backend contract checks
- exports
- optional explore tables
- docs that explain measures/dimensions

## What We Are Not Building Yet

- drag-and-drop BI designer
- arbitrary SQL editor
- full Power BI clone
- full GIS system
- backend event system

## Recommended Stages

### Stage 1

- current `/home` modularized
- typed adapters
- shared filters
- docs/explainer

### Stage 2

TanStack Query for analytics server-state caching if current custom loading grows too complex. Do not add yet unless needed.

### Stage 3

TanStack Table for an "Explore Data" tab with faceted filters, column visibility, sorting, pagination. Do not add yet unless building the tab.

### Stage 4

ECharts only if the current chart library becomes limiting for stacked or multidimensional dashboards.

### Stage 5

Evidence.dev or Observable Framework for internal BI-style report prototypes outside the main portal.

### Stage 6

Metabase or similar only if non-dev users need self-serve dashboards.

### Stage 7

A semantic layer only if measures are duplicated across backend, frontend, and dashboard surfaces.

## Cheap/Open-Source Options

| Option | Best use | Cost/ops burden | Why now or later | Recommendation |
|---|---|---|---|---|
| Current Next.js dashboard | Embedded operational dashboards with portal auth and exports | Low | Already shipped and static-export friendly | Use now |
| TanStack Query | Server-state caching, retries, background refresh | Low-medium | Useful if SWR/custom cache becomes hard to reason about | Later, only if needed |
| TanStack Table | Explore-data grids with sorting/filtering/column controls | Low-medium | Good for an Explore tab, not needed for the home overview | Later |
| ECharts | Dense stacked charts, multi-axis, advanced tooltips | Low-medium | Recharts is enough for current visuals | Later |
| DuckDB / DuckDB-WASM | Browser-side analytical joins over large local extracts | Medium | Heavy for current static portal and not needed for aggregate APIs | Much later |
| Evidence.dev | Developer-authored BI reports | Medium | Better outside the main portal for internal reports | Prototype later |
| Observable Framework | Custom analytical notebooks/reports | Medium | Good for analysis prototypes, not portal runtime | Prototype later |
| Metabase OSS | Self-serve dashboards for non-dev users | Medium-high | Requires backend/ops and permissions model | Later if business asks |
| Cube/semantic layer | Shared measures across apps and BI tools | High | Only useful once measure duplication becomes expensive | Later |
