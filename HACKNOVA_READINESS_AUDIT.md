# SignalTrace — HACKNOVA’26 Readiness Audit

**Audit date:** 2026-10-24  
**Scope:** Repository implementation, existing automated tests and production build, local running API, browser dashboard/map, and a live USGS connectivity check.  
**Code changes:** None. This audit report is the only file created by this audit. The user’s `.env` file was not read, copied, or included.

## Executive summary

SignalTrace currently provides a working demonstration workflow: a user can submit text, preserve it as a claim, split it into atomic statements, request verification, inspect evidence summaries, and view stored incident records on an OpenStreetMap-backed dashboard. The live local app responds successfully. Its incident database currently contains **9 synthetic/demo incidents and 0 live incidents**; the browser rendered all 9 with `DEMO` labels. A separate USGS smoke test reached the public feed and received 4 features, but that check does not ingest them.

The repository does not support several README and UI claims. No NDMA adapter or connected messaging service is present. CrisisMMD is not integrated as a dataset or evaluation set: the UI contains four hand-written text presets, third-party stock-image URLs, and asserted image descriptions. The media component displays those descriptions; it does not perform visual analysis. More seriously, GDACS offline fallback records are normalized as live (`isSynthetic: false`), and dynamic claim matching can cite synthetic or unrelated same-hazard reports as if they were live corroboration. This creates a material risk of false confidence in verdicts.

The deterministic verdict engine’s curated-record tests pass, including all four labels. However, the dynamic path can label a newer cancellation bulletin as a supersession while the verdict engine only calls evidence “Outdated” when its timestamp is no later than the claim timestamp. Ordinary newer corrections therefore do not satisfy both conditions. The matcher also defaults matched incidents to `supporting` without proving that the specific claim detail is in the report. The passing unit tests do not establish sound real-world verification.

**Readiness:** suitable for a clearly labeled synthetic-data demo of claim submission and map interaction. Not ready to be represented as an operational disaster verification service until provenance leakage, false-positive corroboration, temporal logic, and fabricated multimodal/GDACS fallback labels are corrected and evaluated.

## Requirements traceability matrix

| Requirement area | Status | Evidence and current result | Remaining gap | Priority | Recommended next action |
|---|---|---|---|---|---|
| 1. Claim extraction | **PARTIAL** | `POST /api/claims/extract`; `claimExtraction.service.js`, `fallbackExtractor.js`, `llmExtractor.js`, `validator.js`; isolated end-to-end request returned 201, preserved original text and source span. | Fallback splits sentences rather than reliably extracting atomic facts. The validator accepts model-provided source spans, coordinates, attribution, and event times without verifying that spans match the input or metadata is grounded in it. LLM mode is not tested with a real provider. | P1 | Validate source spans against the original text; constrain extracted metadata to source text; label sentence splitting as a fallback extraction mode. |
| 2. Evidence and source comparison | **FAIL** | USGS and GDACS adapters exist; `corroborationMatcher.service.js`; claim detail returns evidence; the UI renders excerpts and links. | Dynamic matcher includes synthetic reports and marks generated `Evidence.isSynthetic` false. It can infer support from a generic same-hazard match. GDACS fallback invents records under live GDACS provenance. No NDMA adapter exists. Credibility and coverage limitations are not adequately explained. | P0 | Prevent synthetic evidence from entering live verification; propagate provenance; remove or correctly mark fallback fixtures; require direct field-level support before a positive verdict. |
| 3. Freshness and temporal reasoning | **FAIL** | Incident schema and USGS adapter distinguish `publishedAt`, `eventOccurredAt`, `updatedAtSource`, `retrievedAt`; ingestion tests cover stale updates. | GDACS assigns `eventOccurredAt = publishedAt` and defaults missing publication time to current time. Claim publication timestamps are not validated. Dynamic supersession test has inconsistent timestamp direction. Timeline invents fallback event times. | P1 | Preserve absent times as absent; distinguish source event time from publication/update time; align supersession detection and verdict conditions; remove inferred chronology steps. |
| 4. Contradiction and verdict logic | **FAIL** | `verificationEngine.test.js` covers four statuses, precedence, insufficient evidence, geographic evidence flags, material details, mixed claims, and repeated verification. All 27 tests passed. | Dynamic matcher’s default support and same-hazard fallback can produce unsupported Verified verdicts. Dynamic Outdated rule conflicts with engine timestamp check. The deterministic engine trusts any linked supporting role; tests predominantly use curated synthetic evidence and do not validate matcher precision against real feed records. | P0 | Fix dynamic evidence matching and provenance first; add end-to-end tests for real-shaped feed records, unrelated events, mixed details, and corrected temporal ordering. |
| 5. Geographic verification and map | **PARTIAL** | Dashboard mounts `GeographicIntelligenceMap`; OSM rendered in browser with attribution; local API returned 9 records with valid nested coordinates; browser displayed 9 `DEMO` markers and 9 feed cards. API uses `geographicInfo.coordinates.latitude/longitude`. Map/list share filtered records; popup/source/time/radius code exists. | No live incidents are currently stored. Only code and rendered controls were checked for filter/selection behavior; interaction coverage is absent from automated tests. Active-claim coordinates may be inferred from a hard-coded place-name dictionary and shown beside distance/correlation language, which needs explicit approximate/context labeling. | P1 | Add map interaction tests; clearly qualify approximate claim locations and proximity as context; ensure false-live fallback records cannot enter markers. |
| 6. Dashboard and user experience | **PARTIAL** | Browser shows submission, recent claims, map, source panel, four verdicts, and health status. Loading/error/empty states exist in components. | UI says “Active Grounding (USGS • GDACS • NDMA)” although NDMA is absent; health endpoint reports healthy regardless of Mongo readiness; sync is a CLI action, not a dashboard action. The media card claims images are audited when no analysis runs. | P1 | Make capability and status labels reflect real integrations and health checks; label the citizen feature as a simulator; remove unsupported media-analysis claims. |
| 7. Datasets and evaluation | **FAIL** | `syntheticDisasterData.js` provides 9 synthetic incident records, 7 synthetic claims, and 10 synthetic evidence records for deterministic scenarios. Tests seed these fixtures. | CrisisMMD files, loader, evaluation pipeline, and metrics are absent. Four hand-authored sample posts carry CrisisMMD labels; stock images and hard-coded “consistent” verdict text are not dataset evidence. No reproducible evaluation measures matcher accuracy. | P1 | Describe CrisisMMD as not integrated; build a small labeled, provenance-safe evaluation set before claiming performance. Do not download the large dataset without separate authorization. |
| 8. Reliability and reproducibility | **PARTIAL** | Startup validates URI/port and exits on DB connection failure; Vite `/api` proxy is configured; ingestion has idempotency/staleness tests; root commands and env examples exist. | Health status is hardcoded healthy; API has no authentication or rate limit; startup/error logging includes the MongoDB URI (which may contain credentials); root `ingest:usgs`, `ingest:gdacs`, and `ingest:incidents` all run both adapters. Offline GDACS fallback compromises provenance. | P1 | Stop logging connection strings; report DB readiness accurately; define deployment access/rate limits; make ingestion command names and behavior match; remove unsafe live-labeled fallback. |
| 9. Technical explanation and launch guide | **PARTIAL** | Root `README.md` documents launch, endpoints, schema concepts, and claimed workflow. Root package scripts provide dev, seed, ingest, build, and test commands. | No separate architecture/data-model document exists. README has stale test counts and claims unsupported NDMA, CrisisMMD, multimodal analysis, and temporal behavior. `client/README.md` is unedited Vite boilerplate. | P2 | Rewrite documentation after code corrections; separate implemented behavior from proposed capabilities; document the actual limitations and a reproducible demo. |

### Sub-requirement findings

| Requirement | Status | Evidence | Gap / next action | Priority |
|---|---|---|---|---|
| Original post preserved and extraction separated from verification | **PASS** | `claim.controller.js` stores `originalText` before extraction; extraction API returns pending claims; separate `POST /api/claims/:id/verify`. Isolated end-to-end confirmed preservation. | Keep this separation explicit in UI/docs. | P3 |
| Atomic statements linked to exact source spans | **PARTIAL** | Fallback computes offsets; `claimExtractionService.test.js` checks offsets. | LLM-provided spans are not checked against original input. | P2 |
| Extraction failures/malformed LLM output safe | **PASS** | Service falls back on LLM failures; tests cover timeout and malformed JSON. | Real provider behavior not verified. | P3 |
| No invented entities, locations, dates, attribution | **PARTIAL** | Fallback returns unknown fields as null. | LLM prompt asks for restraint, but validator does not ground returned entities, dates, locations, or spans. `claimedLocation` request accepts arbitrary object. | P1 |
| Authoritative source integrations accurately listed | **FAIL** | USGS public GeoJSON adapter is real and current smoke test fetched 4 items. GDACS GET adapter exists. | No NDMA implementation. GDACS offline fallback is incorrectly live-labeled. | P0 |
| Evidence is inspectable and linked to source | **PARTIAL** | `getClaimById` populates evidence and incident references; card displays excerpts and URLs. | Auto-generated evidence can have wrong provenance and generic excerpt text; citations do not establish that claim details match. | P0 |
| Publication, occurrence, retrieval, update times distinguished | **PARTIAL** | Schema provides distinct fields; USGS mapping preserves event/update/retrieval values. | GDACS and timeline fallbacks conflate or invent values; claim date validation absent. | P1 |
| No evidence => Unverified | **PASS** | Engine returns Unverified for no records or exclusively insufficient records; tests cover both. Isolated E2E returned Unverified with one insufficient record. | Correct only if matching does not first attach bad supporting evidence. | P1 |
| Supporting evidence => Verified only when appropriate | **FAIL** | Engine returns Verified when any linked evidence has `supporting`; matcher defaults matched incidents to supporting. | Matcher uses hazard/location keyword matching and then same-hazard-only fallback; it does not establish support for material details. | P0 |
| Explicit contradiction => Conflicting, precedence retained | **PARTIAL** | Engine gives Conflicting precedence over Verified and retains evidence; curated tests cover it. | Matcher’s heuristic assignments can label unsupported records as contradictions or support; no source-quality gating. | P1 |
| Outdated requires sufficient temporal evidence | **FAIL** | Engine requires `supersedes=true` and evidence timestamp <= claim publication; curated test passes that rule. | Matcher sets supersedes for bulletin time >= claim time, so a strictly newer bulletin cannot meet the engine condition. No dynamic Outdated test. | P0 |
| Distance alone does not determine truth | **PARTIAL** | Engine ignores raw distance and `locationMatched`; tests cover this. | Matcher can still assign contradiction based on hand-authored text patterns; map proximity language must not imply verdict. | P2 |
| Mixed claims receive separate verdicts | **PASS** | Engine loops per atomic claim; test covers mixed results. | Matcher's claim-wide “any evidence exists” guard can skip evidence generation for other atoms on re-verification. | P2 |
| Map incident coordinates and active claim stay separate | **PARTIAL** | Incident markers use stored nested coordinates; active claim is a separate marker with “REPORT UNDER VERIFICATION” label. | Claim position may be inferred using static place mappings; label it approximate. No claim coordinates become IncidentReport records in this path. | P2 |
| Missing coordinates / zero incidents / offline tiles | **PASS** | No geocoding for incident records; separate unmapped handling; differentiated empty/error guidance; tile error banner; OSM attribution. | Browser verified current non-empty map, not zero-incident and offline-tile states. | P2 |
| Operational health indicator reflects backend and DB | **FAIL** | `useHealthCheck.js` calls `/api/health`; runtime DB is connected. | `health.service.js` hardcodes `status: 'healthy'` without checking `database.status`; UI treats successful HTTP as “System Online.” | P1 |
| Buttons and features are functional | **PARTIAL** | Refresh/filter/map-fit/list-selection handlers present; extraction/verify, export, and simulator paths are present. | No automated/browser interaction check for all map controls; “sync/active feed” is ambiguous; no real WhatsApp/SMS provider. | P2 |
| API validation and access control | **PARTIAL** | Text bounds, pagination/ObjectId checks, centralized errors, CORS origin setting, and malformed JSON tests exist. | Public write/verification routes; no authentication, authorization, or rate limit. Date/location payload validation incomplete. | P1 |

## Architecture and actual data flow

### Claim path

1. `ClaimExtractionCard.jsx` calls `POST /api/claims/extract` through `client/src/services/api.js`.
2. `claim.controller.js` validates text length, stores `originalText`, and invokes `claimExtraction.service.js`.
3. `fallbackExtractor.js` splits sentences and emits source offsets. When configured with an LLM key/provider, `llmExtractor.js` sends a chat-completions request and `validator.js` normalizes its response; failures fall back to sentence splitting.
4. The client automatically calls `POST /api/claims/:id/verify` after extraction.
5. `verificationEngine.js` calls `corroborationMatcher.service.js`, reads IncidentReport records, creates Evidence records, then evaluates each atomic claim against linked evidence and persists verdicts to the claim.
6. `GET /api/claims/:id` returns the claim and evidence; `VerificationResultCard.jsx` renders verdict explanation, excerpts, and any URLs.

The critical weakness is between steps 4 and 5: matching is heuristic and not provenance-safe. It can query synthetic reports as well as live reports, marks generated evidence non-synthetic, defaults generic matches to supporting, and falls back to hazard-only matches when a location match fails.

### Incident/map path

`GeographicIntelligenceMap.jsx` calls `fetchIncidents()` → `GET /api/incidents` → `incident.controller.js` → `incident.service.js` → `IncidentReport.find()`. The actual API envelope has an array in `data` and pagination in `meta`; frontend code reads that shape. Coordinates are `geographicInfo.coordinates.latitude` and `.longitude`. The component excludes invalid/missing coordinates from markers, applies the same filters to map and feed, and keeps an active claim marker visually and textually distinct from incident markers.

The running local API returned 9 incidents and 9 valid coordinate pairs. All 9 had `isSynthetic=true`; 0 were live. The browser showed 9 `DEMO` markers, `Incident Feed (9)`, 9 corresponding cards, and OpenStreetMap attribution. Map controls for provenance, hazard, severity, time window, fit view, marker popups, and feed selection are present in the rendered page. Automated tests cover coordinate validation and helper filters, but not browser interaction for every control. No runtime action wrote to the configured app database during this audit.

`activeClaim` is rendered as a separate “REPORT UNDER VERIFICATION” marker. `resolveClaimCoordinates()` can also look up hard-coded place names in `client/src/utils/geoUtils.js`, so these claim positions are approximate client-side references, not source-provided coordinates. They do not enter the incident API or become official markers.

## Source integration and provenance inventory

| Source | Implementation and endpoint | Authentication | Mapping / identity / time handling | Audit assessment |
|---|---|---|---|---|
| USGS Earthquake Hazards Program | `server/src/services/ingestion/adapters/usgsEarthquakeAdapter.js`; default public GeoJSON all-hour endpoint from config. | No key required. | GeoJSON feature id → `sourceReportId`; place/title/url/magnitude/status; `[longitude, latitude, depth]` → nested WGS84 coordinates; `time` → publication and occurrence, `updated` → source update, ingestion time → retrieval. `isSynthetic=false` for actual fetched reports. | **Implemented.** `npm run test:live` reached USGS on 2026-10-24 and received 4 features. This was a read-only connectivity check; no feed data was inserted into the app database. Coverage is earthquake-only and the configured window is one hour. |
| GDACS | `server/src/services/ingestion/adapters/gdacsAdapter.js`; configured public GDACS event-list GET endpoint. | No key in this implementation. | Event id → `GDACS-${eventId}`; maps event type, severity, title, description, URL, coordinates, radius, and dates. `fromdate`/date → `publishedAt`; `todate` → `updatedAtSource`; `eventOccurredAt` is assigned the publication value. | **Partially implemented, provenance unsafe.** On any fetch failure it returns four hard-coded “benchmark” events. `normalizeFeature()` always marks records `isSynthetic:false`, including those fallback items. The fallback is therefore eligible for live feed labeling and live verification. The adapter test’s fallback test is not proof of live GDACS connectivity. |
| NDMA / NDRF / other Indian agencies | No adapter or live endpoint found under `server/src`. | N/A | Names occur in synthetic fixtures, UI text, or README only. | **Not integrated.** Do not describe NDMA as live grounding. |
| CrisisMMD | Four presets in `client/src/components/ClaimExtractionCard.jsx`; place dictionary labels in `client/src/utils/geoUtils.js`. | N/A | Hand-authored claim text plus remote Unsplash image URLs and asserted provenance/consistency strings. No dataset manifest, image loader, source IDs from CrisisMMD, or evaluator found. | **Not integrated as a dataset or benchmark.** The UI label overstates the evidence. |

The source type fields and source names do not provide an evidence-based credibility ranking. The code has no supported credibility-score model. The system should communicate feed coverage and source limitations directly rather than implying that any matched report is sufficient confirmation.

## Verification-rule assessment

### Intended deterministic precedence

In `server/src/services/verification/verificationEngine.js`, the implemented order is:

1. **Outdated** when a contradicting evidence record has `supersedes=true` and its `evidenceTimestamp <= claim.publishedAt`.
2. **Conflicting** when any non-supersession evidence has role `contradicting`.
3. **Verified** when there is at least one `supporting` record and no contradiction has won.
4. **Unverified** for no evidence, only insufficient evidence, or contextual-only evidence.

The engine does not turn distance values into contradictions. That is a sound boundary in isolation. It trusts the evidence role supplied by the matcher, so it cannot compensate for unsupported role assignments.

### Material defects in the dynamic path

- `corroborationMatcher.service.js` queries incidents without excluding synthetic data. It creates evidence with `isSynthetic:false` regardless of the matched incident’s provenance.
- If a location-constrained match returns nothing, it searches by `eventType` alone. The subsequent generic branch sets `role='supporting'`. This means an unrelated earthquake can support an earthquake claim, even when place matching failed.
- The matcher only has a few string heuristics for magnitude, “hundreds dead”/“flattened”, and power outages. It has no general entailment or field-specific check for casualties, evacuations, roads, damage, and other details. A general event match can be promoted to support.
- The matcher identifies cancellation words and sets `supersedes=true` when the report time is `>=` the claim time. The engine requires that same evidence timestamp to be `<=` the claim time. For a strictly newer correction the conditions conflict, so this path cannot produce the intended Outdated result. Existing Outdated tests use manually seeded Evidence and do not exercise this matcher path.
- The engine returns one verdict per atom, but the matcher exits for the whole parent claim when any Evidence exists. A partial evidence set can prevent evidence being generated for remaining atoms on a repeat verification.
- The test fixture for Scenario G labels a contradiction about deaths as evidence against the flood-location atom. This deliberately tests precedence but is semantically mixed evidence and should not be treated as a sound real-world classification example.

### UI explanation and evidence

The verification card uses the returned `verificationExplanation` and displays evidence roles, excerpts, source names, and links when present. Evidence returned by the dynamic matcher uses a 240-character incident-description excerpt. The UI does not independently validate that a citation supports the displayed claim. A verdict explanation can therefore be accurately displayed while the underlying evidence assignment is wrong.

## Geographic map assessment

- **Mounted:** yes, `DashboardShell.jsx` renders `GeographicIntelligenceMap`.
- **Basemap:** OpenStreetMap tiles and attribution rendered in the browser. External tile access remains required; the component has a tile-error state.
- **Incident API:** status 200; `data` is an array; `meta.totalRecords=9` in the running app.
- **Coordinates:** all nine current incident records have valid nested latitude/longitude values; the frontend reads this schema.
- **Markers and provenance:** nine markers rendered in browser, each labeled `DEMO`; live count 0. Synthetic and live filters exist.
- **Feed/list consistency:** same filtered list is used for mapped and feed incidents; current counts agree at 9.
- **Selection/popups:** handlers and popup fields exist for marker selection, feed selection, timestamps, coordinates, source URL, and optional source radius. A full interactive browser click-through was not performed.
- **Affected radius:** only drawn when `affectedRadiusKm` is stored and within the component’s display bounds; it is not derived from claim distance.
- **Active claim:** separate marker labeled “REPORT UNDER VERIFICATION”; no claim coordinate is turned into an IncidentReport. Static place-name lookups can provide approximate claim positions.
- **Empty/offline:** code distinguishes API failure, empty database, no filter matches, unmapped reports, and tile failure. Zero-data and offline-tile states were not exercised in browser during this audit.
- **Current reality:** the local dashboard’s map is a synthetic demonstration. The live USGS endpoint was reachable, but its records had not been ingested into this database.

## Datasets and evaluation

`server/src/data/syntheticDisasterData.js` contains 9 fictional incident documents, 7 fictional claim documents, and 10 fictional evidence documents, all marked synthetic by the seeder. It includes examples intended to exercise Verified, Conflicting, Outdated, Unverified, mixed claims, geographic contradiction, and material-detail handling. These are stored as separate claim, incident, and evidence records; benchmark claims do not populate the incident feed by themselves.

There are no CrisisMMD source files, data download/import code, dataset license/manifest, split files, ground-truth evaluator, or scored benchmark run. The four UI “CrisisMMD” entries are presets rather than an integrated dataset. No large dataset was downloaded.

**Actual evaluation result:** all 120 existing automated tests passed. This is regression coverage, not a performance measurement; it is built mostly around mocked adapters and hand-authored synthetic records. The actual live feed connectivity check fetched four USGS features but did not evaluate claim classification.

**Recommended reproducible evaluation (not run):** use a small, versioned synthetic fixture set that records claim text, atomic claim labels, source incident IDs, provenance, publication/occurrence/update/retrieval timestamps, expected verdict per atom, and rationale. Include no-evidence, direct support, explicit contradiction, newer superseding bulletin, missing/offset timezone timestamps, unrelated same-hazard event, place mismatch with no explicit denial, mixed event-plus-casualty claims, unsupported casualty/evacuation/damage counts, duplicate evidence, and synthetic/live contamination. Report per-verdict precision/recall and false-Verified rate. Add a separate live-feed ingestion smoke test that records freshness but does not assert truth labels.

## Reliability, configuration, and runtime results

### Commands and configuration

Root scripts are in `package.json`; backend scripts are in `server/package.json`; frontend scripts are in `client/package.json`. `.env.example`, `server/.env.example`, and `client/.env.example` exist. No `.env` values were accessed. The Vite development server proxies `/api` to `VITE_BACKEND_TARGET` or `http://localhost:5000`; the frontend API client otherwise uses `/api`.

Command-name issue: `server/package.json` maps `ingest:usgs`, `ingest:gdacs`, `ingest:incidents`, and `sync:incidents` to the same `ingestIncidents.js`, which always runs both USGS and GDACS adapters. The `npm run test:live` script only checks USGS and returns exit code 0 even when the feed is unreachable (it reports a warning), so automation must inspect output rather than rely only on the exit code.

### Reproducible local demo

After installing dependencies, configuring MongoDB in a local `.env` from `.env.example`, and starting MongoDB:

```powershell
npm run seed          # idempotently loads labeled DEMO incidents, claims, and evidence
npm run dev           # starts the backend and Vite dashboard
```

To ingest live feed records manually when outbound access is available, run `npm run ingest:incidents` from the repository root. That script runs both USGS and GDACS, including the GDACS fallback defect described above. The app does not currently offer an in-dashboard ingestion action. To run verification in the UI, select a demonstration scenario or enter a report and choose **Check Report**. The demonstration scenario path uses the same dynamic matcher and should not be presented as reliable ground-truth performance until the P0 defects are corrected.

`server/src/server.js` logs `config.mongodbUri` during startup, and `server/src/config/db.js` logs the URI on connection error. A URI can contain user credentials; remove those log values before using this in shared or production logs.

### Runtime checks performed

| Check | Result |
|---|---|
| `GET http://127.0.0.1:5000/api/health` | **200 / success**; database reported connected. Code inspection found the service’s overall `status` is hardcoded to `healthy`, so it is not a reliable degraded-DB signal. |
| `GET /api/claims?limit=2` | **200 / success**; 14 total claims in current app DB. |
| `GET /api/incidents?limit=100` | **200 / success**; 9 total; `data` is an array; 9 `isSynthetic=true`; 0 live; all 9 have nested coordinates. |
| Isolated end-to-end `POST /api/claims/extract` → `POST /api/claims/:id/verify` → `GET /api/claims/:id` | **201**, one extracted atom, original text and source span preserved; **200** verification returned **Unverified**; one insufficient evidence record; isolated incident list was empty. Used a uniquely named audit database, not the configured app DB. |
| Browser map | **Verified in browser:** 9 mapped count, nine `DEMO` map markers, `Incident Feed (9)`, nine cards, OSM attribution. No LIVE markers. |
| `npm run test:live` | **Success:** public USGS endpoint responded in 456 ms and returned 4 features. Read-only; did not write to MongoDB. |

The application can serve its dashboard and synthetic examples without external incident feeds. The map tiles themselves need external OpenStreetMap access. Real verification coverage is limited to reports present in the database; the system does not establish that absence from its feeds means an event did not occur.

### Automated tests and build

- `npm test` — **PASS**, 17 test files, 120 tests passed, run against a fresh uniquely named local MongoDB database (`signaltrace_audit_20261024`). Existing application database was not reset or modified by this test run.
- `npm run build` — **PASS**; Vite built the production frontend. It emitted a warning that the minified main JavaScript bundle is 508.13 kB, above the 500 kB warning threshold.
- `npm run test:live` — **PASS for connectivity only**, as described above.
- No separate lint command was run; it was not needed to answer the requested audit criteria.

## Known limitations and dependencies

- MongoDB is required for claim persistence, incident feed storage, and evidence retrieval. Startup exits when connection fails.
- Live feed access requires network access. USGS is unauthenticated and working at audit time; GDACS live connectivity was not independently verified.
- OpenStreetMap raster tiles require network access and their attribution remains visible.
- LLM extraction requires a configured API key and outbound provider access; default configuration uses deterministic sentence splitting. Only mocked LLM tests were run. `llmExtractor.js` currently implements OpenAI-compatible chat completions with Bearer auth; setting a provider name alone does not implement Gemini or other provider protocols.
- All HTTP routes are public. No auth, authorization, or request rate limit is present. This is a local/demo deployment profile, not a hardened public emergency service.
- The product is not connected to WhatsApp, SMS, NDMA, or a crisis-image analysis service; the citizen bot and some media features are simulators/presentation elements.
- The current database has no live incident documents despite successful USGS network access; ingestion is an explicit CLI command.
- Root README has inconsistent and stale test counts and sections that describe non-existent or only simulated capabilities.

## Prioritized remediation plan

### P0 — Prevent false live alerts and false verification

1. Remove fabricated GDACS fallback events or label them synthetic from adapter output through storage, API, map, and evidence. Never allow fallback records to carry `isSynthetic=false`.
2. Make dynamic matching provenance-aware. Do not use synthetic incident/evidence for live claims unless the entire result is visibly marked DEMO; propagate incident provenance into generated evidence.
3. Remove same-hazard-only support fallback. Require direct claim-to-report relevance and specific-detail support; otherwise produce Unverified or contextual evidence.
4. Reconcile dynamic supersession timestamp ordering with the Outdated rule and test the whole extraction→match→verdict path using a newer bulletin, an old claim, a current claim, and missing times.

### P1 — Bound reliability and operator interpretation

5. Validate input dates, claim locations, LLM coordinates, and source spans against source text; do not synthesize missing event/publication times.
6. Make health/readiness reflect database state; remove credentials from connection-string logs.
7. Remove or relabel unsupported CrisisMMD and image-analysis assertions; do not call a hard-coded image consistency string an audit.
8. Add tests for provenance leakage, unrelated same-hazard matching, unsupported material details, dynamic Outdated behavior, map filter/list synchronization, and offline GDACS behavior.
9. Define deployment access control, request limits, and operational monitoring before exposing public write/verify endpoints.

### P2 — Make the demo reproducible and truthful

10. Correct README/UI source descriptions (especially NDMA and CrisisMMD), package command semantics, actual test count, and current workflow limitations.
11. Label client-inferred claim coordinates as approximate and keep proximity language explicitly contextual.
12. Replace fabricated timeline fallback steps with “timestamp unavailable” states. Add browser checks for zero incidents, tile failure, map selection, filters, and source links.
13. Split the 508 kB frontend bundle where practical.

## Genuinely demo-ready vs. needs work

### Demo-ready with visible synthetic-data labeling

- Text claim submission and persistence.
- Deterministic sentence-splitting fallback and separate verification request.
- Curated synthetic claim/evidence scenarios for illustrating the verdict card.
- Incident API and dashboard map/list rendering of explicitly labeled synthetic incidents.
- OpenStreetMap basemap, coordinate validation, source details, and empty/error UI code paths.
- USGS public feed adapter connectivity at audit time; manual ingestion command is available.

### Needs work before operational or evidence-based claims

- Trustworthy live verification from dynamic matching (false-positive and provenance defects above).
- Reliable Outdated classification in the live/dynamic path.
- GDACS offline behavior and live-vs-demo provenance.
- NDMA integration, messaging delivery, and CrisisMMD ingestion/evaluation.
- Multimodal image provenance, scene classification, recycled-photo detection, and consistency analysis.
- Accurate DB-dependent operational health, public API protections, production security, and complete technical documentation.

## Repository evidence index

- Claim routes/controllers/services: `server/src/routes/claim.routes.js`, `server/src/controllers/claim.controller.js`, `server/src/services/claim.service.js`.
- Extraction: `server/src/services/extraction/claimExtraction.service.js`, `fallbackExtractor.js`, `llmExtractor.js`, `validator.js`.
- Verification and matching: `server/src/services/verification/verificationEngine.js`, `corroborationMatcher.service.js`.
- Models: `server/src/models/claim.model.js`, `evidence.model.js`, `incidentReport.model.js`.
- Live ingestion: `server/src/services/ingestion/adapters/usgsEarthquakeAdapter.js`, `gdacsAdapter.js`, `server/src/services/ingestion/incidentIngestion.service.js`.
- Seed and fixtures: `server/src/services/seed.service.js`, `server/src/data/syntheticDisasterData.js`, `server/src/scripts/seed.js`.
- Dashboard/map: `client/src/pages/DashboardShell.jsx`, `client/src/components/ClaimExtractionCard.jsx`, `VerificationResultCard.jsx`, `GeographicIntelligenceMap.jsx`, `IncidentSourcePanel.jsx`, `client/src/utils/geoUtils.js`.
- Test suites: 17 files under `server/tests/`; full run result recorded above.
