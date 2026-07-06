---
title: 'Product Behavior Specs'
description: 'Current PopChoice product behavior for quiz, recommendations, movie memory, catalog browsing, group mode, and evaluation expectations.'
---

# Product Behavior Specs

This page documents current PopChoice behavior so product and engineering work
share the same baseline. It is not a commitment to future features. Planned
behavior is called out separately and should stay linked to GitHub issues before
implementation.

Related work: parent epic
[#515](https://github.com/shchilkin/PopChoice/issues/515), this page
[#517](https://github.com/shchilkin/PopChoice/issues/517), and related product
epics [#34](https://github.com/shchilkin/PopChoice/issues/34),
[#82](https://github.com/shchilkin/PopChoice/issues/82), and
[#359](https://github.com/shchilkin/PopChoice/issues/359). For adjacent
technical references, see [/docs/RECOMMENDATION-ROADMAP](/docs/RECOMMENDATION-ROADMAP),
[/docs/SERVICES](/docs/SERVICES), [/docs/API-REFERENCE](/docs/API-REFERENCE),
[/docs/DEVELOPMENT](/docs/DEVELOPMENT), and [/docs/CI-CD](/docs/CI-CD).

## Current Quiz Flow

The quiz starts from a choice between solo mode and same-device group mode.
Solo mode creates one participant named with the localized "you" label. Group
mode first collects participant names, requires at least two non-empty names,
and falls back to "Person 1" and "Person 2" if the setup is incomplete.

Each participant answers the same seven steps:

1. Reference movie: optional favorite/reference title. Leaving it blank keeps
   the search open; users can also explicitly choose the no-reference path.
2. Search lane: `new`, `classic`, or `both`.
3. Tonight's vibe: one or more mood/genre ids from the current fixed list.
4. Energy level: `light`, `balanced`, `serious`, or `dark`.
5. Discovery appetite: `safe`, `balanced`, or `surprise`.
6. Hard avoids: optional stop signals such as horror, gore, slow pacing,
   subtitles, long runtime, obvious picks, obscure picks, or likely already-seen
   movies.
7. Optional actor: free text.

The browser translates each participant into the recommendation API contract:

```ts
{
  name?: string;
  favoriteMovie: string;
  favoriteMovieWhy?: string;
  newVsClassic: string;
  moodPreference: string[];
  tonePreference: string;
  favoriteActor?: string;
}
```

For one participant the payload is one object. For group mode the payload is an
array of participant objects. Required product inputs are era, at least one
mood, tone, and discovery appetite. The favorite movie can be intentionally
blank. Favorite actor, favorite-movie reason, and hard avoids are optional.
Discovery appetite and hard avoids are carried as structured text in
`favoriteMovieWhy` until a broader taste-signal backend contract replaces the
legacy recommendation request shape.

## Current Recommendation Lifecycle

The quiz submits to `POST /api/recommendations`. The API validates the request,
rate-limits it, persists a recommendation row, and returns a stable slug in
`{ id }` with `201`. The quiz then navigates to `/results/{id}` and the result
page loads the persisted record through `GET /api/recommendations/{id}`.

In normal runtime the recommendation can be processed by BullMQ workers when
Redis is available. If the queue is unavailable, the app falls back to inline
processing after creating the persisted row. The persisted result moves through
statuses and stages such as queued, preparing, embedding, local search, TMDB
search, AI ranking, poster enrichment, descriptions, completed, or failed.

The current pipeline:

- screens and normalizes quiz input before expensive work;
- embeds the participant request;
- searches the local vector catalog;
- excludes the user's referenced movie titles from candidates;
- loads signed-in movie memory and feedback signals when available;
- falls back to TMDB candidate discovery when local candidates are too weak;
- asks the AI model to pick from the filtered candidate set;
- guards against out-of-set model titles by falling back to the strongest valid
  candidate;
- enriches results with posters, localized names, and per-movie descriptions;
- persists the main pick plus alternate picks.

Signed-in users can see their own completed recommendation history. Shared
result URLs can be opened by other viewers, but rating feedback is only
available when the viewer can rate that recommendation.

## Current Movie Memory And Feedback

Movie memory is account-scoped. Anonymous users can complete a recommendation
flow, but durable memory is tied to a signed-in account.

The dedicated `/account/movie-memory` experience lets signed-in users mark
catalog candidates as:

- `watched`: the user has seen this movie.
- `not_seen`: the user has not seen this movie.

The page supports candidate cards, batched submission, paginated memory history,
large-list rendering, catalog search, delete-by-movie-key, and a TMDB fallback
for candidate discovery when local candidates are exhausted and `TMDB_API_KEY`
is configured.

Recommendation feedback on completed results accepts:

- `useful`: records the main pick as `liked`.
- `already_watched`: records the main pick as `watched`.
- `not_for_me`: records the main pick as `not_interested`.
- `wrong_mood`: records the main pick as `wrong_mood`.
- `too_obvious`: records the main pick as `not_interested`.
- `too_obscure`: records the main pick as `not_interested`.
- `close`: records feedback on the recommendation but does not create a movie
  memory item.

Completed result pages also expose follow-up actions that combine feedback with
the existing one-shot more-picks queue:

- "More like this" records `useful` feedback, then requests one additional
  TMDB-backed batch from the same result.
- "Try another" records `not_for_me` feedback, then requests the same follow-up
  batch.

Only one more-picks batch can be claimed per recommendation, so repeated
follow-up actions reuse the same duplicate protection as the direct more-picks
control.

Current recommendation behavior uses memory conservatively:

- watched, not-interested, too-obvious, too-obscure, and recently recommended
  movies are excluded from future candidates;
- wrong-mood movies are down-ranked instead of fully excluded;
- liked movies get a small positive ranking boost;
- watched exclusions win over liked boosts so obvious repeats stay filtered;
- TMDB ids are preferred for identity, with normalized title/year fallback when
  TMDB identity is unavailable.

## Current Available Movies Behavior

`/available-movies` is a browse and verification surface for the local catalog,
not the full TMDB universe. It reads from `GET /api/movies` and displays a
paginated catalog page with 50 movies per page.

Current filters are:

- free-text query over title, actor/director names, and genre metadata;
- year range;
- duration bucket: under 90, 90-120, or over 120 minutes;
- minimum score: 7.0, 8.0, or 9.0;
- age rating chips.

The UI applies some filters immediately and applies text/year search through
the Apply action. It caches previously loaded page/filter combinations in the
browser, cancels stale in-flight requests, shows a skeleton while loading, and
has distinct empty states for an empty catalog versus active filters with no
matches.

Current #82 scope is partially complete because title, actor/director, genre,
runtime, score, age-rating, and year filtering are present. Remaining #82 work
should be treated as planned until split into smaller issues, for example richer
autocomplete, search history, more explicit multi-genre UX, keyword search,
sorting, or a broader TMDB-backed discovery surface.

## Current Group Mode

Group mode is currently same-device and sequential. The person holding the
device enters participant names, each participant answers the same quiz, and
the final payload is one array of participant answer objects.

The result page recognizes group results by participant count and shows
group-oriented copy and insights when the persisted result includes them. The
current model does not create room records, invite links, readiness state, QR
codes, projector mode, or independent participant sessions.

## Current 0.2.0 Taste-Control Scope

The `v0.2.0` Better Taste Control milestone is tracked by
[#826](https://github.com/shchilkin/PopChoice/issues/826). The completed scope
is:

- [x] [#827](https://github.com/shchilkin/PopChoice/issues/827): explicit avoids
      and constraints in Fast Pick and Normal Match.
- [x] [#828](https://github.com/shchilkin/PopChoice/issues/828): optional,
      lower-friction reference movie UX.
- [x] [#829](https://github.com/shchilkin/PopChoice/issues/829): discovery
      appetite for safe, balanced, and surprising picks.
- [x] [#830](https://github.com/shchilkin/PopChoice/issues/830): result
      feedback loop v1.
- [x] [#831](https://github.com/shchilkin/PopChoice/issues/831):
      deterministic eval coverage for taste-control signals.
- [x] [#832](https://github.com/shchilkin/PopChoice/issues/832): product docs
      and release notes.

Release notes live in
[/docs/releases/v0.2.0](/docs/releases/v0.2.0).

## Planned Product Direction

Planned behavior should remain issue-backed and should not be described as
current product behavior until implemented.

Recommendation experience direction is tracked in
[/docs/RECOMMENDATION-ROADMAP](/docs/RECOMMENDATION-ROADMAP). The likely next
shape is a shared taste-signal model that can combine quiz answers, swipe
reactions, account memory, and result feedback. Future quiz and recommendation
work should move the current structured-text bridge into a first-class backend
contract so avoids, constraints, discovery appetite, and feedback no longer
need to travel through legacy request fields.

Group rooms are a larger milestone under
[#359](https://github.com/shchilkin/PopChoice/issues/359), split into:

- [#467](https://github.com/shchilkin/PopChoice/issues/467): room persistence,
  TTL, cleanup, and participant storage.
- [#468](https://github.com/shchilkin/PopChoice/issues/468): share links,
  participant join flow, and readiness state.
- [#469](https://github.com/shchilkin/PopChoice/issues/469): recommendation
  orchestration from completed room answers.
- [#470](https://github.com/shchilkin/PopChoice/issues/470): QR invite and
  projector mode.

The current same-device group mode should remain available until room-backed
group mode is reliable enough to replace it intentionally.

## Testing And Eval Expectations

Product e2e tests validate behavior without live AI calls. The default e2e
recommendation flow uses `E2E_DETERMINISTIC_RECOMMENDATIONS=1`, a migrated
isolated PostgreSQL database, Redis, and deterministic recommendation fixtures.
That coverage proves the browser, API, database, result page, feedback, and
movie-memory persistence flow, not model quality.

Run product e2e when changes affect:

- quiz steps, validation, submit, or results handoff;
- available-movies search and filters;
- auth/session flows used by product paths;
- recommendation feedback or movie-memory persistence.

Run `npm run eval:recommendations` when changes affect recommendation prompts,
embeddings, OpenAI/TMDB integration, candidate filtering/ranking, feedback
signals, response shape, or eval fixtures. For catalog retrieval, schema,
seed/backfill, or candidate availability changes, consider the real-data eval
path described in [/docs/DEVELOPMENT](/docs/DEVELOPMENT) and
[/docs/CI-CD](/docs/CI-CD). Live-provider evals are manual because they can
spend API credits and depend on provider availability.
