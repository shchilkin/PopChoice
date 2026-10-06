---
status: accepted
---

# Version curated collections through a publish lifecycle

Curated Collections are versioned Backoffice entities. Editors prepare a Draft Collection Version, preview it, and publish it. A Published version is immutable and serves new Curated Picks attempts. Further editorial changes create a new Draft and eventually a new Published version. Archived versions cannot start new attempts but remain addressable so historical recommendation results reproduce the exact collection contract they used.

Collection membership uses TMDB IDs. Each version carries localized title, description, and editorial rationale alongside its ordered membership.

## Consequences

- Curated recommendation records persist the exact Collection Version identifier.
- Backoffice needs draft editing, preview, publish, archive, and version-history capabilities.
- Publishing is an explicit state transition rather than an in-place update.
- Local movie-cache rows may enrich collection items but do not define collection identity or membership.
- Localization changes to published editorial copy require a new Collection Version.
