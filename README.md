# SignalTrace

> **Disaster Information Verification Agent**  
> Developed for **HACKNOVA'26 Finals**  
> *Phase 7.1: User-Friendly UI Simplification*

---

## 1. Product Objective

During natural disasters and humanitarian crises, inaccurate, conflicting, and outdated information proliferates rapidly across social media platforms and forwarded messaging channels. **SignalTrace** is an intelligent verification system engineered to:

1. **Extract Factual Claims**: Ingest unstructured crisis messages and decompose them into distinct, verifiable factual statements.
2. **Authoritative Corroboration**: Cross-examine claims against official, timestamped disaster reports and alerts from trusted emergency agencies (e.g., NDMA, USGS, GDACS).
3. **Deterministic Verification**: Assign one of four strict verification statuses using verifiable application logic backed by stored evidence:
   - 🟢 **Verified**: Claim corroborated by official emergency bulletins and verified incident reports.
   - 🔴 **Conflicting**: Claim directly contradicts official casualty, road status, or evacuation data.
   - 🟡 **Outdated**: Claim was factually accurate earlier, but has since been superseded by newer official reports.
   - ⚪ **Unverified**: Insufficient authoritative evidence exists in stored repositories to confirm or deny.
4. **Explainable Evidence**: Provide an evidence dashboard with source timestamps, supporting and contradicting citations, geographic mapping, and an audit trail.

---

## 2. Architecture & File Structure

```text
SignalTrace/
├── client/                             # Frontend (React 19 + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Header with status & branding
│   │   │   ├── HealthIndicator.jsx     # Live API connectivity badge
│   │   │   └── ClaimExtractionCard.jsx # Interactive Phase 3 claim extraction form
│   │   ├── pages/
│   │   │   └── DashboardShell.jsx      # Main dashboard shell
│   │   ├── services/
│   │   │   └── api.js                  # Frontend API client (health, extractClaims)
│   │   ├── hooks/
│   │   │   └── useHealthCheck.js       # Live API polling & offline state
│   │   └── styles/
│   │       └── index.css               # Design system & tokens (dark theme)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                             # Backend (Node.js + Express + Mongoose)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js                  # Environment validator (PORT, DB, LLM config)
│   │   │   └── db.js                   # Mongoose connection manager
│   │   ├── data/
│   │   │   └── syntheticDisasterData.js# Deterministic synthetic disaster scenarios
│   │   ├── models/
│   │   │   ├── claim.model.js          # Raw message, atomic claims subdocuments, status
│   │   │   ├── incidentReport.model.js # Authoritative alerts with compound uniqueness
│   │   │   ├── evidence.model.js       # Excerpts, roles, references (no auto-verdicts)
│   │   │   └── index.js
│   │   ├── routes/
│   │   │   ├── claim.routes.js         # POST /api/claims/extract, GET /api/claims
│   │   │   ├── incident.routes.js      # GET /api/incidents
│   │   │   ├── health.routes.js        # GET /api/health
│   │   │   └── index.js
│   │   ├── controllers/
│   │   │   ├── claim.controller.js     # Claim list, detail, and extraction controllers
│   │   │   ├── incident.controller.js  # Incident report list controller
│   │   │   └── health.controller.js
│   │   ├── services/
│   │   │   ├── extraction/             # Dedicated Claim Extraction Engine:
│   │   │   │   ├── claimExtraction.service.js  # Coordinator & length/text validator
│   │   │   │   ├── fallbackExtractor.js        # Deterministic sentence splitter
│   │   │   │   ├── llmExtractor.js             # Provider-independent LLM adapter
│   │   │   │   └── validator.js                # Output guardrail & schema normalizer
│   │   │   ├── claim.service.js        # Claim pagination & evidence population
│   │   │   ├── incident.service.js     # Incident pagination & filtering
│   │   │   ├── seed.service.js         # Deterministic seeder logic
│   │   │   └── health.service.js
│   │   ├── middleware/
│   │   │   ├── errorHandler.js         # Centralized JSON error handler
│   │   │   └── notFoundHandler.js      # JSON 404 handler
│   │   ├── scripts/
│   │   │   └── seed.js                 # Seeder CLI runner
│   │   ├── utils/
│   │   │   └── apiResponse.js          # Standardized response envelopes
│   │   ├── app.js                      # Express application setup
│   │   └── server.js                   # Server bootstrap & lifecycle entrypoint
│   └── tests/                          # Automated Vitest integration test suite (50 tests)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 3. Atomic Claim Extraction Pipeline

### What is an Atomic Claim?
An atomic claim expresses a single, independently verifiable factual assertion extracted from a disaster post.

**Input Post**:
> *"Flooding has submerged three villages near Nashik. The main bridge collapsed yesterday, and 200 families have been evacuated."*

**Decomposed Atomic Claims**:
1. `Flooding has submerged three villages near Nashik.` (Type: `event`)
2. `The main bridge collapsed yesterday.` (Type: `damage`)
3. `200 families have been evacuated.` (Type: `evacuation`)

### Atomic Claim Schema
Each extracted atomic claim captures:
- `atomicClaimId`: Deterministic claim identifier (`ac-1`, `ac-2`, etc.)
- `text`: Normalized claim text
- `claimType`: Category (`event`, `casualty`, `damage`, `evacuation`, `location`, `other`)
- `entities`: Array of recognized named entities (`[{ name, category }]`)
- `location`: Structured claimed location if identifiable (`{ rawText, city, region, country, coordinates }`) or `null`
- `eventTime`: Recoverable time of the alleged event or `null`
- `attribution`: Cited source or speaker (e.g. *"Officials report"*) or `null`
- `uncertainty`: `{ isUncertain: boolean, qualification: string | null }`
- `sourceSpan`: Relevant excerpt and character offsets in original post (`{ text, startOffset, endOffset }`)
- `extractionMethod`: `'llm'` or `'deterministic_fallback'`

> [!IMPORTANT]
> **Extraction Boundary**: Extraction normalizes and decomposes text. It deliberately does **not** assign a verification verdict (`Verified`, `Conflicting`, `Outdated`, or `Unverified`). Verdict assignment is handled by the verification engine in Phase 4.

---

## 4. Extraction Modes & Fallback

The pipeline uses a provider-independent architecture:

1. **Deterministic Fallback (Default)**:
   - Active when `LLM_PROVIDER=fallback` or no `LLM_API_KEY` is provided.
   - Performs rule-based sentence segmentation with exact `sourceSpan` character offsets.
   - **Guardrails**: Strictly does **not** hallucinate or fabricate entities, coordinates, dates, or attributions. All unknown fields remain `null`.

2. **LLM Provider (Configurable)**:
   - Active when an API key is provided and `LLM_PROVIDER` is configured (e.g., `'openai'`, `'gemini'`).
   - Uses strict schema instructions forbidding hallucination and enforcing structured JSON output.
   - Enforces timeout limits (`LLM_TIMEOUT_MS`).
   - **Resilience**: If the LLM call times out or returns malformed non-JSON, the engine automatically falls back to deterministic sentence splitting without failing the user request.

---

## 5. API Endpoints

### 1. `POST /api/claims/extract`
Ingests a raw disaster post, extracts atomic claims, persists the parent Claim record, and returns the result.

**Request Body**:
```json
{
  "text": "An earthquake damaged buildings in Pune. Officials report that 40 families have been evacuated.",
  "sourcePlatform": "synthetic-demo",
  "authorId": "@pune_reporter"
}
```

**Success Response (HTTP 201 Created)**:
```json
{
  "success": true,
  "message": "Atomic claims extracted successfully",
  "data": {
    "_id": "6adb2c705011c8210afbaa0f",
    "originalText": "An earthquake damaged buildings in Pune. Officials report that 40 families have been evacuated.",
    "sourcePlatform": "synthetic-demo",
    "authorId": "@pune_reporter",
    "processingStatus": "completed",
    "atomicClaims": [
      {
        "atomicClaimId": "ac-1",
        "text": "An earthquake damaged buildings in Pune.",
        "claimType": "damage",
        "entities": [],
        "location": null,
        "attribution": null,
        "uncertainty": { "isUncertain": false, "qualification": null },
        "sourceSpan": {
          "text": "An earthquake damaged buildings in Pune.",
          "startOffset": 0,
          "endOffset": 40
        },
        "extractionMethod": "deterministic_fallback"
      },
      {
        "atomicClaimId": "ac-2",
        "text": "Officials report that 40 families have been evacuated.",
        "claimType": "evacuation",
        "entities": [],
        "location": null,
        "attribution": "Officials",
        "uncertainty": { "isUncertain": false, "qualification": null },
        "sourceSpan": {
          "text": "Officials report that 40 families have been evacuated.",
          "startOffset": 41,
          "endOffset": 95
        },
        "extractionMethod": "deterministic_fallback"
      }
    ],
    "isSynthetic": false,
    "createdAt": "2026-10-23T09:44:16.064Z",
    "updatedAt": "2026-10-23T09:44:16.072Z"
  },
  "meta": {
    "extractedClaimCount": 2,
    "extractionMethod": "deterministic_fallback"
  },
  "timestamp": "2026-10-23T09:44:16.074Z"
}
```

**Validation Errors (HTTP 400 Bad Request)**:
- Empty or whitespace text: `{"code": "INVALID_INPUT_TEXT", "message": "Field 'text' cannot be empty or whitespace-only"}`
- Text shorter than 5 chars: `{"code": "TEXT_TOO_SHORT", "message": "Field 'text' must be at least 5 characters long"}`
- Text longer than 2000 chars: `{"code": "TEXT_TOO_LONG", "message": "Field 'text' exceeds maximum allowed length of 2000 characters"}`

### 2. `GET /api/claims`
Paginated list of claims with deterministic sorting (`createdAt: -1, _id: -1`).
- Query parameters: `page` (default 1), `limit` (default 10, max 50), `status`.

### 3. `GET /api/claims/:id`
Returns a single claim by its MongoDB ObjectId, including its extracted atomic claims and associated evidence.

### 4. `GET /api/incidents`
Paginated list of incident reports (`publishedAt: -1, _id: -1`), excluding internal `rawPayload`.

### 5. `GET /api/health`
System uptime, operational status, and MongoDB connection metrics.

---

## 6. Environment Configuration

Copy `.env.example` to `.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/verialert
VITE_API_URL=http://localhost:5000/api

# LLM Configuration (Optional)
# If not configured, the deterministic sentence-splitting fallback is active.
LLM_PROVIDER=fallback
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
LLM_TIMEOUT_MS=8000
```

---

## 7. Running Tests & Production Build

### Running the Full Test Suite
```bash
npm test
```
Runs **50 automated integration and unit tests** across 9 test suites:
- `claimExtractionService.test.js` (15 tests): Input bounds, sentence fallback splitting, offset spans, schema validation, LLM mock, timeout recovery.
- `claimExtractApi.test.js` (8 tests): Multi-claim POST, single-claim POST, database persistence, empty/oversized validation errors, no-verdict guardrail.
- `schemas.test.js` (7 tests): Model required fields, default arrays, enums, compound uniqueness on IncidentReport.
- `claimsApi.test.js` (6 tests): Pagination, limits, filtering, claim lookup with evidence, 400 invalid ID, 404 missing ID.
- `incidentsApi.test.js` (5 tests): Incident pagination, payload projection, and eventType/severity filters.
- `seeder.test.js` (3 tests): Seeder idempotency (no duplicate records) and user data isolation.
- `health.test.js` (3 tests): Operational status and timestamp envelope.
- `notFound.test.js` (2 tests): 404 handler for unmatched routes.
- `errorHandler.test.js` (1 test): Centralized error middleware for malformed JSON payloads.

### Running the Frontend Build
```bash
npm run build
```

### Seeding Synthetic Data
```bash
npm run seed
```

### Running Locally (Development)
```bash
npm run dev
```

---

## 8. Authoritative Disaster Feed Integration (Phase 5)

SignalTrace integrates live, authoritative disaster event feeds to populate verified incident reports for claim corroboration.

### Integrated Source: USGS Earthquake Hazards Program
- **Official Documentation**: [USGS Earthquake API & Real-time Feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php)
- **Endpoint**: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson`
- **Access Terms**: Public domain (USGS / US Government), free public access, no API key required
- **Event Coverage**: Seismological events (`eventType: 'earthquake'`)
- **Geographic Coverage**: Global real-time seismic monitoring with WGS84 coordinates `[longitude, latitude, depth]`
- **Update Frequency**: Continuously updated GeoJSON feed updated every minute

### Operational Ingestion Commands

```bash
# Ingest live USGS earthquake alerts into database (idempotent)
npm run ingest:usgs

# Equivalent alias
npm run sync:incidents

# Run live connectivity smoke test (clearly separated from automated tests)
npm run test:live
```

### Normalized Schema Field Mapping

| GeoJSON Source Property | IncidentReport Target Field | Normalization & Mapping Rules |
|-------------------------|-----------------------------|-------------------------------|
| `feature.id` | `sourceReportId` | Unique event ID (e.g. `ci41350983`, `us7000xxxx`) |
| Constant | `sourceName` | `"USGS Earthquake Hazards Program"` |
| Constant | `sourceType` | `"geological_survey"` |
| `properties.url` | `sourceUrl` | Direct URL to official event page |
| Constant | `eventType` | `"earthquake"` |
| `properties.title` | `title` | E.g. `"M 5.8 - 45 km N of Mandalay, Myanmar"` |
| Synthesized | `description` | Formatted summary: magnitude, depth, location, status, origin time |
| `properties.mag` + `alert` | `severity` | `mag >= 7.0`: `extreme`, `>= 6.0`: `severe`, `>= 4.5`: `moderate`, `>= 0`: `minor`, else: `unknown`. PAGER alert colors take priority if present. |
| `geometry.coordinates[1]` | `geographicInfo.coordinates.latitude` | Latitude bounded between -90 and 90 |
| `geometry.coordinates[0]` | `geographicInfo.coordinates.longitude` | Longitude bounded between -180 and 180 |
| `properties.place` | `geographicInfo.locationName` | Reported place description |
| Unfabricated | `geographicInfo.adminRegion` | `null` (not fabricated) |
| Unfabricated | `geographicInfo.country` | `null` (not fabricated) |
| Unfabricated | `geographicInfo.affectedRadiusKm` | `null` (not fabricated) |
| `properties.time` | `publishedAt` / `eventOccurredAt` | Epoch ms converted to UTC ISO Date |
| `properties.updated` | `updatedAtSource` | Source revision timestamp used for staleness guard |
| Ingestion time | `retrievedAt` | Timestamp of ingestion execution |
| Filtered subset | `rawPayload` | `{ mag, place, time, updated, url, status, magType, depthKm }` |
| Constant | `isSynthetic` | `false` (distinguishes live data from benchmark ground truth) |

### Ingestion Guarantees & Safety Architecture

1. **Strict Idempotency**:
   - Compound unique index on `{ sourceName: 1, sourceReportId: 1 }` prevents duplicates.
   - Running ingestion repeatedly on the same or unchanged feed produces 0 duplicates and 0 false updates; identical records are safely `skipped`.
2. **Staleness Protection**:
   - Compares incoming `updatedAtSource` against stored `updatedAtSource`.
   - Older or identical incoming versions **never** overwrite newer stored updates.
   - Refined or reviewed reports strictly newer than stored records trigger in-place updates.
3. **Synthetic Data Isolation**:
   - Benchmark synthetic dataset (`isSynthetic: true`) used for deterministic evaluations (Scenarios A–G) is completely isolated and never modified or deleted during live feed synchronization.
4. **Fault Tolerance & Partial Batches**:
   - Individual malformed records are logged and counted under `failed` without terminating the batch.
   - Feed timeouts and network interruptions are caught with detailed diagnostics (`FEED_TIMEOUT`, `FEED_FETCH_HTTP_ERROR`).
5. **No Blind Secrets**:
   - Public GeoJSON endpoint requires no credentials; no secrets are persisted in payloads or logs.

### Known Limitations
- The USGS feed is specific to seismological hazards; flood, meteorological, and wildfire reports remain simulated by the synthetic dataset until specialized adapters (e.g. GDACS, CWC) are added in subsequent phases.
- Reverse geocoding for administrative boundaries (state/district) is not fabricated from raw place text without an authoritative GIS gazetteer.

---

## 10. Phase 6: Emergency Intelligence Dashboard

SignalTrace has been evolved into a focused, responsive **Emergency Intelligence Verification Dashboard** designed for crisis analysts and emergency operations teams.

### Core Dashboard Capabilities

1. **Header & Operational Telemetry**:
   - Real-time backend API and MongoDB status indicators.
   - Truthful live-feed sync status (USGS Earthquake Hazards Program) derived from actual stored database counts, preventing deceptive "live" claims when feeds are unpopulated.
   - Clear distinction between synthetic benchmark scenarios (`isSynthetic: true`) and live ingested feeds (`isSynthetic: false`).
   - Collapsible system diagnostics inspector for runtime latency, uptime, and JSON envelopes.

2. **Claim Verification Workspace (`ClaimExtractionCard`)**:
   - Single-click crisis message submission with character boundary safeguards (max 2000 chars).
   - Pre-loaded benchmark scenarios covering Scenarios A through G (flood cresting, earthquake over-reporting, outdated cyclone orders, geographic mismatches, multi-claim mixed outcomes, and embankment breaches).
   - Sentence-level atomic decomposition into discrete verifiable assertions.
   - Deterministic rule-based verification with per-claim evidence linking.
   - No post-level verdict assignment: each atomic claim retains its own independent verdict even within the same post.

3. **Recent Persisted Claims Explorer (`RecentClaimsPanel`)**:
   - Direct integration with `GET /api/claims` (persisted MongoDB claims).
   - Filtering by the four required verdicts: `Verified`, `Conflicting`, `Outdated`, `Unverified`, plus `All`.
   - Displays submission timestamp, source platform badge, atomic claims count, processing status, and verdict distribution tags.
   - Interactive selection: clicking any historical claim immediately populates the verification workspace with its raw text, extracted atomic claims, and stored evidence matches.

4. **Incident Source Explorer (`IncidentSourcePanel`)**:
   - Real-time exploration of authoritative incident reports stored in MongoDB via `GET /api/incidents`.
   - Filtering by data provenance: **All Sources**, **Live USGS Feeds Only**, or **Synthetic Benchmarks Only**.
   - Filtering by hazard event type: Earthquake, Flood, Cyclone, Wildfire, Landslide, Severe Weather.
   - Explicit WGS84 coordinate chips preparing the integration boundary for the Phase 7 Interactive Map without fabricating coordinates.
   - Transparent disclosure notices emphasizing that the repository reflects stored authoritative records and not exhaustive world alerts.

5. **Verdict Classification & Uncertainty Differentiation**:
   - Strict adherence to the four verdicts:
     - 🟢 **Verified**: Corroborated by official bulletins without contradiction.
     - 🔴 **Conflicting**: Directly contradicts official alerts or casualty assessments.
     - 🟡 **Outdated**: Previously factual information superseded by a newer official bulletin.
     - ⚪ **Unverified**: Missing or inadequate evidence.
   - The UI distinguishes between three critical evidential states:
     - `NO EVIDENCE IN REPOSITORY`: No corresponding incident reports found for the topic/location.
     - `DETAIL UNSUPPORTED (INSUFFICIENT)`: An incident is corroborated, but the specific assertion (e.g. casualty count) lacks authoritative substantiation.
     - `CONTRADICTED BY EVIDENCE`: Authoritative data explicitly refutes the claim.

---

## 11. Phase 7: Interactive Geographic Intelligence Map

SignalTrace incorporates an interactive, evidence-grounded **Geographic Intelligence Map** visualizing emergency incident reports using actual stored location coordinates from authoritative sources and evaluation benchmarks.

### Key Map Capabilities & Architecture

1. **Mapping Framework & Basemap**:
   - Built with **Leaflet** and **React-Leaflet** using dark-themed **CartoDB Dark Matter** tiles (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`).
   - Attribution: `&copy; OpenStreetMap contributors &copy; CARTO`.
   - Requires zero external API keys or paid geocoding services.
   - Graceful tile-offline resilience: if external map tiles cannot be fetched (e.g. offline sandbox or network disruption), an amber status notice displays while markers, coordinate badges, popups, and the synchronized incident list remain 100% operational.

2. **Strict Coordinate Validation & Zero Fabrication Policy**:
   - Markers are plotted **only** when an incident document contains explicitly stored, finite, and valid geographic coordinates:
     - `latitude`: Number in `[-90, 90]`
     - `longitude`: Number in `[-180, 180]`
   - Place names without stored coordinates (e.g., broad nationwide advisories) are **never** geocoded, guessed, or positioned at arbitrary default coordinates.
   - Unmapped incidents are explicitly tallied and displayed in the synchronized list with a clear `No coordinates stored` indicator.

3. **Data Provenance & Category Distinction**:
   - Custom SVG/HTML pins (`L.divIcon`) ensure no missing Vite asset paths and clearly communicate provenance:
     - 🔷 **LIVE AUTHORITATIVE FEED**: Cyan pins with pulsing live radar badges and verified agency source IDs.
     - 🔶 **SYNTHETIC BENCHMARK DEMO**: Amber/violet pins with explicit `DEMO` text tags indicating synthetic test scenarios.
   - Severity-coded styling: Border rings and backgrounds map to incident severity (Extreme: Rose, Severe: Amber, Moderate: Cyan, Minor: Emerald).
   - Hazard glyphs for immediate category recognition (⚡ Earthquake, 🌊 Flood, 🌀 Cyclone, 🔥 Wildfire, ⛰️ Landslide, ⛈️ Severe Storm).

4. **Interactive Popups & Documented Radius**:
   - Detailed popup cards displaying:
     - Official title, category, and severity label.
     - Formatted WGS84 coordinates (e.g., `26.5420° N, 88.7190° E`).
     - Documented affected radius (e.g., `25 km`) rendered as an optional dashed radial boundary circle when specified by the official agency (e.g. CWC or USGS PAGER).
     - Distinct occurrence timestamp (`eventOccurredAt`) vs publication timestamp (`publishedAt`).
     - Official source name and direct link to source bulletin (`sourceUrl`).

5. **Multi-Dimensional Filters & Synchronized List**:
   - Filters:
     - **Provenance**: All, Live USGS Feeds Only, Synthetic Benchmarks Only.
     - **Hazard Category**: Earthquake, Flood, Cyclone, Wildfire, Landslide, Severe Storm.
     - **Severity**: Extreme, Severe, Moderate, Minor.
     - **Time Window**: All Available, Past 24 Hours, Past 7 Days, Past 30 Days.
   - View Controls: "Fit View" automatically computes bounding box to fit all visible markers.
   - Interactive List Synchronization: Clicking an incident in the feed list smoothly flies the map to its coordinates and opens its popup card. Clicking a map marker highlights the incident in the feed.

6. **Clear Separation of Location from Claim Verification**:
   - Prominently labeled notice clarifies that a map marker reflects an *officially reported incident location*, **not** validation of social media claims. Verification remains the domain of the deterministic claim engine.

---

## 12. Running Tests & Production Build

### Running Automated Mocked Tests (Offline, No Internet Required)
```bash
npm test
```
Runs **104 automated unit and integration tests** across 13 test suites:
- `incidentGeo.test.js` (3 tests): Geographic coordinate validation, `hasCoordinates=true` filtering, date range boundaries.
- `usgsAdapter.test.js` (16 tests): GeoJSON parsing, normalization, coordinate bounding, severity mapping, timeout/network mocks.
- `incidentIngestion.test.js` (7 tests): Feed persistence, strict idempotency, staleness guards, partial batch failures, synthetic isolation.
- `verificationEngine.test.js` (27 tests): Deterministic verification precedence, supersession, geographic mismatch, casualty detail independence, idempotency.
- `claimExtractionService.test.js` (15 tests): Input bounds, sentence fallback, LLM mock, timeout recovery.
- `claimExtractApi.test.js` (8 tests): Claim extraction API integration and validation.
- `schemas.test.js` (7 tests): Model validation, required fields, enum constraints.
- `claimsApi.test.js` (7 tests): Claim pagination, limits, status filters, and verdict query filtering.
- `incidentsApi.test.js` (5 tests): Incident pagination, projection, eventType/severity filters.
- `seeder.test.js` (3 tests): Synthetic seeder idempotency and user data isolation.
- `health.test.js` (3 tests): Operational status and timestamp envelope.
- `notFound.test.js` (2 tests): 404 handler for unmatched routes.
- `errorHandler.test.js` (1 test): Centralized error middleware.

### Running Live Connectivity Smoke Test (Requires Internet Access)
```bash
npm run test:live
```
Contacts the live USGS GeoJSON endpoint directly, reports latency and sample feature data, and validates end-to-end network connectivity.

### Running the Frontend Build
```bash
npm run build
```

### Seeding Synthetic Baseline
```bash
npm run seed
```

### Ingesting Live USGS Incident Reports
```bash
npm run ingest:usgs
```

### Running Locally (Development)
```bash
npm run dev
```

---

## 13. Phase 7.1: User-Friendly UI Simplification

Phase 7.1 refined the user-facing interface, copy, and layout to ensure SignalTrace feels like an intuitive emergency verification product rather than a developer testing harness:

1. **Natural, Accessible Product Language**:
   - *“Claim Verification Workspace”* → **“Check a Disaster Report”**
   - *“Disaster Report / Crisis Message”* → **“Paste a disaster report”**
   - *“Benchmark Scenarios”* → **“Try an Example”** with human-friendly descriptions (*“Flood report (Teesta River)”*, *“Earthquake report (Chamoli M7.2)”*, *“Bridge damage report (Suketi River)”*, etc.)
   - *“Extract & Verify”* → **“Check Report”**
   - *“Recent Claims”* → **“Recent Reports”** with `{count} reports checked` and `{count} statement(s)`
   - *“2 atoms”* → **“2 statements”**
   - *“Deterministic Pipeline”* → **“How Verification Works”**
   - *“Stored Incident Intelligence”* → **“Official Reports & Alerts”**

2. **Clear Verdict Explanations**:
   - Preserved all 4 internal enum values (`Verified`, `Conflicting`, `Outdated`, `Unverified`) with clear, non-overpromising explanations:
     - 🟢 **Verified**: Available evidence supports this statement.
     - 🔴 **Conflicting**: Available evidence contradicts this statement.
     - 🟡 **Outdated**: Newer evidence supersedes earlier information.
     - ⚪ **Unverified**: There is not enough evidence to confirm this statement.

3. **Demoted Developer Diagnostics into Collapsible "System Details"**:
   - Moved internal connection parameters, database connection details, and raw CLI ingestion commands into a collapsible **“System Details”** drawer.
   - Primary dashboard status bar now displays clean, honest metrics: *System Status*, *Live Feed* (distinguishing ready to sync from synced count), and *Example Scenarios*.

4. **Removed Technical Clutter & Developer Badges**:
   - Eliminated `extractionMethod: fallback/llm` tags, "Phase 6 Active", "Phase 7 Active", and raw database syntax from regular user flows.
   - Cleaned branding across the client from leftover mixed branding (`SignalTrace — VeriAlert`) to **SignalTrace** consistently.
   - Replaced internal evidence tags (`CONTRADICTED BY EVIDENCE` → `CONTRADICTS OFFICIAL REPORT`, `SUPERSEDED BY BULLETIN` → `SUPERSEDED BY NEWER UPDATE`, `CORROBORATED BY SOURCE` → `SUPPORTED BY OFFICIAL REPORT`).



