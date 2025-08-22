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
- InstantDB stores organization data; US Census API supplies statistics
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
- POST handler forwarding prompts to OpenRouter
- Uses `censusTools` helpers for variable search/validation
- Called by `CensusChat`

### app/api/insight/route.ts
- POST handler for free-form statistical analysis
- Processes stat data through OpenRouter for insights
- Called by `CensusChat` in insight mode

### app/api/logs/route.ts
- In-memory log store for external request debugging
- Consumed by `/logs` page

### app/logs/page.tsx
- Client page that polls `api/logs` for latest entries
- Independent of main map flow

### app/stats/page.tsx
- Management interface for stored statistics
- Allows editing, deleting, and refreshing stat data
- Connected to InstantDB stats entity

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
- Chat UI with user/admin/fast-admin mode toggle
- **User mode**: Searches stored stats, provides insights via `/api/insight`
- **Admin mode**: Live Census API queries, adds new metrics via `/api/chat`
- **Fast admin mode**: Uses `openai/gpt-oss-120b:nitro` with guardrails for quick metric additions
- Dispatches metrics to `MetricContext`
- Persists chat messages and mode selection to localStorage
- Collapsible container with reopen button; clear controls for chat and active metrics

### components/MetricContext.tsx
- React context tracking active ZCTA metrics and geometries
- API: `addMetric`, `selectMetric`, `metrics`, `clearMetrics`
- Persists active metrics and selected metric to localStorage

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

### lib/censusTools.ts
- Loads Census variable metadata and caches results
- `searchCensus` and `validateVariableId` helpers with tokenized search for loose queries

### lib/mapLayers.ts
- `createOrganizationLayer` for point markers
- `createZctaMetricLayer` for choropleth metrics
- Pure functions returning deck.gl layers

### lib/openRouter.ts
- `callOpenRouter` wrapper centralizing headers and error handling

### lib/logStore.ts
- In-memory array with `addLog` and `getLogs` APIs
- Server-only utility used by log route

### lib/censusVariables.ts
- Curated list of ACS variable IDs and descriptions
- Imported by `censusTools`

### lib/censusQueryMap.ts
- Maps chat tool names to Census variable IDs
- Used during LLM tool execution

### lib/okcZctas.ts
- Static GeoJSON of Oklahoma City ZCTAs
- Consumed by `prefetchZctaBoundaries`

## Types
### types/organization.ts
- `Organization` and `Location` interfaces shared across codebase

### types/stat.ts
- `Stat` interface for stored statistical data
- Used by stats management and insight features

## Data Flow
- `page.tsx` loads organizations and renders `OKCMap`
- `OKCMap` layers come from `mapLayers.ts`
- `CensusChat` requests `/api/chat`; results update `MetricContext`
- `MetricContext` supplies metric data to `OKCMap` for display

## External Services
- US Census API for ACS statistics
- OpenRouter for LLM responses
- InstantDB for organization storage

## Processes
- Users pan/zoom map, click markers, view organization info
- Chat searches Census variables, overlaying metrics on map
- `/logs` page polls log API for debugging

## Gotchas
- Append `_001E` to variable IDs for estimate values
- Census uses large negative numbers for missing data; treat as `null`
- deck.gl `onClick` handlers receive an unused event parameter
- Boundary data is cached; call `prefetchZctaBoundaries` early

## Development
- `npm run dev` – start dev server
- `npm run lint` – run ESLint
- `npm run build` – production build

## Environment Variables
- `NEXT_PUBLIC_INSTANT_APP_ID` – InstantDB application id
- `INSTANT_ADMIN_TOKEN` – InstantDB admin token below to authenticate with the backend.
- `OPENROUTER_KEY` – OpenRouter API key
