# Internal API

Foundation endpoints:
- GET /health
- GET /api/v1/catalog/status
- GET /api/v1/metadata/curve-kinds
- POST /api/v1/selections/preview
- POST /api/v1/selections/run
- POST /api/v1/rules/evaluate

The API is internal to the company's own platform. It is not a SPAIX integration.


## File ingestion

- `POST /api/v1/ingestion/import` accepts `documentId`, `fileName`, `mimeType`, `contentBase64`, and optional `createdBy`.
- PDF, XLSX/XLS/CSV and DOCX/DOC are parsed before AI extraction. Images require an OCR provider at the parser boundary.
- The API requires `AI_INGESTION_URL`; the provider returns structured candidate data, confidence, source references and conflicts.
- The result is persisted as an ingestion Candidate. It is never published automatically.
- Engineer workflow: PATCH candidate -> approve candidate -> explicit publish candidate.

- `importScope` may be `catalog`, `curves`, `dimensions`, `motors`, `materials`, `seals`, or `configurations`. Targeted imports are scope-validated; data outside the requested scope is rejected before candidate persistence.
