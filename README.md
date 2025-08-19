# NEProto

## Tech Stack
- Next.js App Router
- Tailwind CSS v4
- InstantDB for realtime data
- MapLibre GL + deck.gl for interactive maps
- OpenRouter for LLM-powered chat

## Directory Overview
- `app/`
  - `page.tsx` – main page combining map, org panel, and chat
  - `api/chat/route.ts` – AI-assisted Census chat endpoint
  - `api/logs/route.ts` – in-memory request log API
  - `logs/page.tsx` – live log viewer
- `components/`
  - `OKCMap.tsx` – renders MapLibre + deck.gl layers
  - `OrganizationDetails.tsx` – side panel for organization info
  - `CensusChat.tsx` – chat UI that adds Census metrics
  - `MetricContext.tsx` – tracks selected metrics & ZCTA features
  - `ConfigContext.tsx` – stores dataset/year/region selections
  - `AddOrganizationForm.tsx`, `TopNav.tsx` – UI helpers
- `lib/`
  - `db.ts` – InstantDB client setup
  - `census.ts` – `fetchZctaMetric`, `prefetchZctaBoundaries`
  - `censusTools.ts` – `loadVariables`, `searchCensus`, `validateVariableId`
  - `mapLayers.ts` – `createOrganizationLayer`, `createZctaMetricLayer`
  - `openRouter.ts` – `callOpenRouter` wrapper
  - `logStore.ts` – `addLog` & `getLogs`
  - `censusVariables.ts`, `censusQueryMap.ts`, `okcZctas.ts` – curated data sets
- `types/organization.ts` – `Organization` and `Location` interfaces

## Data Flow
- `page.tsx` queries organizations from InstantDB and passes them to `OKCMap`
- `OKCMap` assembles deck.gl layers via helpers in `mapLayers.ts`
- Clicking a marker triggers `OrganizationDetails` to show org data
- `CensusChat` talks to `/api/chat`; on tool calls `MetricContext.addMetric`
- `MetricContext.selectMetric` pulls data via `fetchZctaMetric` and feeds `OKCMap`

## External Services
- US Census API for ACS statistics
- OpenRouter gateway for LLM responses
- InstantDB for persistent organization records

## Processes
- Users pan/zoom map, click markers, view org details
- Chat searches Census variables and adds ZCTA metrics to the map
- `/logs` page polls the log API for debugging external calls

## Gotchas
- Census variable IDs often need a `_001E` suffix for estimate values
- Census responses use large negative numbers for missing data; treat as `null`
- deck.gl `onClick` handlers receive an unused event argument
- ZCTA boundaries are fetched once and cached; `prefetchZctaBoundaries` hides latency

## Development
- `npm run dev` – start dev server
- `npm run lint` – run ESLint
- `npm run build` – production build

## Environment Variables
- `NEXT_PUBLIC_INSTANT_APP_ID` – InstantDB application id
- `OPENROUTER_KEY` – OpenRouter API key
