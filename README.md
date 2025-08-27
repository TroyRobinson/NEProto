# NEProto

## Tech Stack
- Next.js App Router
- Tailwind CSS v4
- - See globals.css for design system: Montserrat font, 8px spacing units, color scheme (blue accent, yellow secondary, red, green, etc.)
- InstantDB for realtime data
- - See instant-rules.md for how to use the InstantDB database.
- MapLibre GL + deck.gl for interactive maps
- OpenRouter for LLM-powered chat

## Architecture Overview
- React contexts manage map configuration and selected metrics
- MapLibre map overlaid with deck.gl layers for org markers and ZCTA metrics
- InstantDB stores organizations and per-city stats; US Census API supplies statistics
- Region-aware: OKC, Tulsa, Wichita with ZCTA subsets and state-specific boundaries (OK/KS)
- OpenRouter-powered chat searches Census variables and adds layers

## App Files
### app/layout.tsx
- Provides `ConfigProvider` and `MetricsProvider` to all pages
- Sets global fonts and styles

### app/page.tsx
- Main map view with `NavBar`, `OKCMap`, and `OrganizationDetails`
- Fetches organizations from InstantDB and passes them to `OKCMap`
- Overlay metrics bar with `MetricDropdown` and a clear button when metrics exist
- Collapsible `CensusChat` container anchored bottom-right

### app/api/chat/route.ts
- POST handler orchestrating chat responses and Census lookups
- Embeds active metric data so models can answer locally
- Heuristically adds metrics for plain ID lists or short action commands
- Falls back to a smarter model only when needed and reports when it does
- Advanced heuristic triggers on: why, how, explain, compare, contrast, insight, analysis, reason, think, thinking, because
- Supports mode override via request body `mode`: 'auto' (default), 'fast' (no fallback), 'smart' (force advanced)

### app/api/insight/route.ts
- POST handler for free-form statistical analysis
- Processes stat data through OpenRouter for insights

### app/api/logs/route.ts
- In-memory log store for external request debugging
- Consumed by `/logs` page

### app/logs/page.tsx
- Client page that polls `api/logs` for latest entries
- Independent of main map flow
- Renders a distinct "User Request" bubble (time + plain text) before related actions
- Hides duplicate "last user" context on adjacent entries to keep timeline concise

### app/stats/page.tsx
- Management interface for stored statistics
- Columns: Code, City, Description, Category, Dataset, Source, Geo, Year, Actions
- Sorted to group rows by Code → City → Year
- Allows editing, deleting, and refreshing stat data

### app/data/page.tsx
- Table view of the currently selected metric by ZCTA
- Uses `MetricContext`; shows data when a metric is selected

### app/about/page.tsx
- Simple project description page

### app/orgs/page.tsx
- Placeholder for organization management

### app/debug/page.tsx
- Debug page to validate InstantDB data loading

## Components
### components/OKCMap.tsx
- Composes MapLibre map and deck.gl overlay
- Builds layers via `createOrganizationLayer` and `createZctaMetricLayer`
- Emits `onOrganizationClick` callback

### components/OrganizationDetails.tsx
- Side panel showing selected organization details
- Populated from map click events

### components/CensusChat.tsx
- Single chat interface for questions and metric requests
- Detects simple commands locally and loads stats automatically
- Sends active metric data to `/api/chat`
- Shows an immediate notice when deferring to a deeper model (so users know to wait)
- Persists chat messages to localStorage
- Collapsible container with reopen button; clear controls for chat and active metrics
- Appends an Approach chip on assistant messages at the bottom-right of each message row; dropdown to re-run from the last user message with Auto/Fast/Smart
 - Follow-up ideas: after each assistant reply (unless the reply is a question), shows two compact, vertically stacked indigo buttons with next-step ideas — one to "Add data for …?" (avoids active/mentioned metrics) and one curiosity question from the user’s perspective. Clicking runs the relevant action; typing clears them.

### components/MetricContext.tsx
- React context tracking active ZCTA metrics and geometries
- API: `addMetric`, `selectMetric`, `metrics`, `clearMetrics`
- Persists active metrics and selected metric to localStorage
- Region-aware matches (code + dataset + year + region); otherwise fetches and saves per-city
- Saves stats per city with `city`, `region`, `geography`, and canonical `codeRaw`
- Logs an "InstantDB fulfilled <code>" note in the `/logs` timeline on cache hits

### components/ConfigContext.tsx
- Stores dataset/year/region selections
- API: `config`, `setConfig`

### components/AddOrganizationForm.tsx
- Form to insert organization records into InstantDB
- Separate from map display

### components/NavBar.tsx
- Responsive top navigation (Map, Data, Stats, Logs, Orgs, About)
- "Add Organization" action (via prop) opens `AddOrganizationForm` modal
- Mobile drawer with overlay/Escape to close; highlights active route

### components/MetricDropdown.tsx
- Selector for active metric when multiple metrics are loaded

### components/MetricsTable.tsx
- Simple table to list metrics and labels (used in data/map contexts)

### components/ConfigControls.tsx
- Dropdown controls for region, year, dataset, geography (provided via `ConfigContext`)

## Library Modules
### lib/db.ts
- Instantiates and exports a configured InstantDB client

### lib/census.ts
- `fetchZctaMetric` retrieves ACS data for a ZCTA/variable
- `prefetchZctaBoundaries` loads and caches GeoJSON polygons
- Auto-loads state ZIP boundaries (OK or KS) based on requested ZCTAs

### lib/censusTools.ts
- Loads Census variable metadata and caches results
- `searchCensus` and `validateVariableId` helpers
- When provided an `origin`, posts log entries to `/api/logs` for visibility across server modules

### lib/mapLayers.ts
- `createOrganizationLayer` for point markers
- `createZctaMetricLayer` for choropleth metrics
- Pure functions returning deck.gl layers

### lib/openRouter.ts
- `callOpenRouter` wrapper centralizing headers and error handling
- Posts request/response logs to `/api/logs` when `origin` is provided (ensures Logs page sees server events)

### lib/logStore.ts
- In-memory array with `addLog` and `getLogs` APIs
- Server-only utility used by log route
- Summarizes `User request` and `InstantDB fulfilled <code>` entries for a readable timeline

### lib/censusVariables.ts
- Curated list of ACS variable IDs and descriptions
- Imported by `censusTools`

### lib/censusQueryMap.ts
- Maps chat tool names to Census variable IDs
- Used during LLM tool execution

### lib/okcZctas.ts, lib/tulsaZctas.ts, lib/wichitaZctas.ts
- ZCTA lists per region used to scope Census queries

## Types
### types/organization.ts
- `Organization` and `Location` interfaces shared across codebase

### types/stat.ts
- `Stat` interface for stored statistical data (see Stats Entity below)
- Used by stats management and insight features

## Data Flow
- `page.tsx` loads organizations and renders `OKCMap`
- `OKCMap` layers come from `mapLayers.ts`
- `CensusChat` requests `/api/chat`; results update `MetricContext`
- `MetricContext` supplies metric data to `OKCMap` for display
- For metrics: prefer InstantDB stats (region-aware); otherwise fetch from US Census and persist per city

## External Services
- US Census API for ACS statistics
- OpenRouter for LLM responses
- InstantDB for organization storage

## Processes
- Users pan/zoom map, click markers, view organization info
- Chat searches Census variables, overlaying metrics on map
- `/logs` page shows a timeline: User Request bubble, then OpenRouter and US Census actions
- Advanced queries trigger an immediate defer notice while a deeper model runs
 - Chat auto-scroll positions the top of the view to the latest assistant reply so users read the answer first and can scroll to discover ideas at the end

## Gotchas
- Append `_001E` to variable IDs for estimate values
- Census uses large negative numbers for missing data; treat as `null`
- deck.gl `onClick` handlers receive an unused event parameter
- Boundary data is cached; call `prefetchZctaBoundaries` early
- `stats.codeRaw` holds the canonical Census id; `stats.code` may be stored as `codeRaw|City` to avoid uniqueness conflicts

## Stats Entity (InstantDB)
- Fields: `code` (stored key, may be `codeRaw|City`), `codeRaw` (canonical id), `description`, `category`, `dataset`, `source`, `year`, `region`, `city`, `geography`, `data`
- Per-city persistence: OKC, Tulsa, Wichita supported; region-aware matching and map recentering

## Development
- `npm run dev` – start dev server
- `npm run lint` – run ESLint
- `npm run build` – production build

## Environment Variables
- `NEXT_PUBLIC_INSTANT_APP_ID` – InstantDB application id
- `INSTANT_ADMIN_TOKEN` – InstantDB admin token below to authenticate with the backend.
- `OPENROUTER_KEY` – OpenRouter API key
