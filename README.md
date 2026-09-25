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
