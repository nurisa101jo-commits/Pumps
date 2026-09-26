# Pumps Platform

Company-specific pump selection and product-configuration platform.

## Architecture
- Single-company catalog; no multi-manufacturer abstraction.
- Internal company API.
- Product Data is separated from engineering Rules.
- Curves are structured Q-H / efficiency / power / NPSH data.
- Motor, dimensions, curve and other components are configuration-specific.
- Deterministic Selection Engine performs hydraulic matching; AI assists ingestion, organization and reporting.
- AI output is never published directly: engineer approval is required. Unresolved conflicts trigger an explicit confirmation warning but do not technically block approval.
- Undo/Redo plus manual and automatic backups; no product versioning.

## Workspace
- `apps/api` — internal REST API
- `apps/admin` — engineering administration portal
- `apps/selection` — customer selection portal
- `packages/domain` — shared engineering domain contracts
- `packages/selection-engine` — deterministic selection logic
- `packages/db` — persistence schema boundary
- `packages/ai` — AI ingestion/approval boundary

## Run locally

### 1. Requirements
- Node.js 22+
- pnpm 10.15+
- PostgreSQL 16+ (optional for a quick in-memory UI check)

### 2. Install
```bash
pnpm install
```

### 3. Quick UI check — no database required
The API can run in memory for a quick inspection. Set `SEED_DEMO=true` in `.env` to load a development-only sample pump:

```bash
pnpm dev
```

Then open:
- Customer Selection Portal: http://localhost:4174
- Engineering Admin Portal: http://localhost:4173
- API health: http://localhost:4000/health

In this mode, data is kept in memory and is lost when the API restarts.

### 4. PostgreSQL mode
Copy `.env.example` to `.env`, start PostgreSQL, then run:

```bash
pnpm dev
```

For the included local PostgreSQL container:

```bash
docker compose up -d postgres
```

The API will run migrations when `RUN_MIGRATIONS=true`.

### 5. AI import
AI-assisted catalog/project import requires an internal AI extraction endpoint:

```
AI_INGESTION_URL=http://your-internal-ai-service/extract
AI_INGESTION_API_KEY=...
```

AI extraction produces reviewable candidates. It does not publish catalog data directly.

## Main test flow

1. Open the Admin Portal.
2. Create a Pump Series.
3. Create a Pump Model under the series.
4. Create a Motor.
5. Create compatible engineering options.
6. Create a Pump Configuration.
7. Add dimensions and structured curves.
8. Open the Customer Selection Portal.
9. Select the series, model and configuration.
10. Enter one or more duty points.
11. Run hydraulic selection.
12. Review the curve and selection result.
13. Generate/save the selection sheet.

## Production workflow

```text
Product Documents
      ↓
AI Extraction
      ↓
Draft Candidate + Sources + Conflicts
      ↓
Engineer Review / Edit
      ↓
Engineer Approval
      ↓
Explicit Publish
      ↓
Company Catalog
      ↓
Deterministic Selection Engine
      ↓
Customer Selection / Selection Sheet
```

AI is an assistant in the workflow; the deterministic selection engine remains responsible for hydraulic matching and engineering constraints.
