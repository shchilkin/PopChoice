---
status: accepted
---

# Snapshot required TMDB metadata when publishing collections

Publishing a Collection Version resolves every member by TMDB ID and materializes a Collection Metadata Snapshot containing the identity, runtime, genres, title, year, poster metadata, and localized display data required for Curated Picks. Missing movies, duplicate TMDB IDs, or missing evidence required to evaluate supported Hard Constraints block publication. Runtime Curated Picks reads the immutable snapshot and does not require live TMDB.

Refreshing changed TMDB metadata produces a new Collection Version instead of mutating a published snapshot.

## Consequences

- Draft preview can expose unresolved or incomplete items, while publish validation cannot.
- Curated Picks remains available during TMDB provider outages.
- Published collection membership and constraint evidence are reproducible together.
- Backoffice needs explicit validation errors per collection item.
- Poster or localization refreshes are versioned editorial changes for published collections.
