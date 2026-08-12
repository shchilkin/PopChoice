# Recommendation V2 delivery plan

Recommendation V2 replaces DB-first candidate generation with a TMDB-first policy engine. The accepted domain language lives in [CONTEXT.md](../CONTEXT.md), and the decisions behind it live in [docs/adr](./adr).

## Product contract

- Audience Context is Solo, Duo, or Group.
- Recommendation Experience is Fast Pick, Normal Match, Taste Swipe, or Curated Picks.
- Every non-curated experience discovers candidates from TMDB. The Local Movie Cache enriches and reranks matching TMDB IDs but does not define or inject the candidate set.
- Hard Constraints are structured, participant-confirmed vetoes. Missing required evidence makes a candidate ineligible.
- Deterministic eligibility, shortlisting, group fairness, diversity, and quality gates run before bounded AI reranking.
- Curated Picks is the explicit editorial exception and stays inside an immutable published Collection Version.
- Movie memory stores independent watch and taste dimensions as immutable events plus a current snapshot.

The tracker source of truth is [epic #610](https://github.com/shchilkin/PopChoice/issues/610).

## v0.3.0 Recommendation V2 Foundation

Work in blocker order:

1. [#925](https://github.com/shchilkin/PopChoice/issues/925) upgrades the active OpenAI model roles independently of the retrieval redesign.
2. [#606](https://github.com/shchilkin/PopChoice/issues/606) freezes the V1 baseline and executable V2 quality contract.
3. [#927](https://github.com/shchilkin/PopChoice/issues/927) introduces canonical intent and versioned engine routing.
4. [#929](https://github.com/shchilkin/PopChoice/issues/929) ships the Normal Match Solo TMDB-first tracer.
5. [#931](https://github.com/shchilkin/PopChoice/issues/931) adds controlled V1/V2 comparison and release evidence.
6. [#932](https://github.com/shchilkin/PopChoice/issues/932) migrates Fast Pick to bounded retrieval and Deepen Search.
7. [#608](https://github.com/shchilkin/PopChoice/issues/608) adds Duo/Group maximin compromise and private constraint recovery.
8. [#934](https://github.com/shchilkin/PopChoice/issues/934) retires V1 and the legacy intent adapter after the rollback window.

Curated Picks can progress in parallel: [#926](https://github.com/shchilkin/PopChoice/issues/926) publishes immutable collection versions, then [#613](https://github.com/shchilkin/PopChoice/issues/613) exposes the visitor experience after the V2 release evidence in #931.

## v0.4.0 Taste Swipe MVP

Two workstreams converge:

1. [#928](https://github.com/shchilkin/PopChoice/issues/928) expands movie memory into events and snapshots.
2. [#930](https://github.com/shchilkin/PopChoice/issues/930) migrates product reads and corrections to snapshots.
3. [#920](https://github.com/shchilkin/PopChoice/issues/920) ships anonymous Solo Taste Swipe on the released V2 core.
4. [#923](https://github.com/shchilkin/PopChoice/issues/923) adds signed-in persistence and explicit anonymous Memory Adoption after #920 and #930.
5. [#933](https://github.com/shchilkin/PopChoice/issues/933) removes the legacy single-kind memory contract.

## Release evidence

PopChoice does not currently have enough traffic for meaningful percentage rollout or A/B statistics. Release evidence therefore comes from deterministic scenarios, saved provider runs, Backoffice V1/V2 comparison, and manual dogfooding. V1 remains temporarily available through a kill switch and is removed only after the recorded rollback window closes.
