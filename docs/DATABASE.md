# Database

PostgreSQL is the intended production database.

The initial migration models:
- series and models
- configuration-specific motors
- configuration-specific dimensions
- structured performance curves and Q/value points
- engineering rules
- source traceability
- audit events

The persistence boundary is exposed through repository interfaces so the selection engine does not depend on SQL details.
