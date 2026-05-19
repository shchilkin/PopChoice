# Product

## Register

brand

## Users

Movie enthusiasts who want personalized recommendations without endless scrolling. Two equally weighted modes: solo users choosing something for themselves, and groups deciding together (two or more people with potentially different tastes). Users expect the experience to feel effortless and fun, not like filling out a form or using a search engine.

## Product Purpose

PopChoice is an AI-powered movie recommendation engine. Users answer a short questionnaire; the system uses OpenAI embeddings and vector search to return semantically matched films. The core promise: skip the paralysis of infinite choice and get to a movie worth watching. Group mode extends this to collaborative decisions, making it the go-to tool when nobody can agree on what to watch.

## Brand Personality

Cinematic, Confident, Playful. The "Cinematic Concierge" — culturally aware, opinionated, and genuinely enthusiastic about movies. Not a utility. Not a widget. An experience that makes picking a movie feel like an event.

## Anti-references

- Generic streaming platforms (Netflix dark-red, Disney dark-blue) — no category-reflex palettes
- Amazon-style "you might also like" recommendation cards — boring, transactional, invisible
- Heavy film-festival editorial sites — over-designed, alienating, prioritizes aesthetic over usability
- The rule: fun and unusual enough to be memorable, legible and purposeful enough to understand at a glance

## Design Principles

1. **Delight before utility** — the experience should feel like an event, not a search box. Every screen has a reason to smile.
2. **Group-first thinking** — solo and group modes are equal. Flows, affordances, and copy should feel as natural for two people deciding together as for one person alone.
3. **Glanceable clarity** — unusual is fine; confusing is not. The product's purpose and next action must be obvious within three seconds of landing.
4. **Cinema without cliché** — evoke the feeling of movies and shared watching without copying streaming platform aesthetics or film-school pretension.
5. **Earn the personality** — playfulness lives in thoughtful details (motion, copy, micro-interactions), not in loud decoration or novelty for its own sake.

## Accessibility & Inclusion

WCAG AA compliance. Standard good practices: sufficient color contrast, keyboard navigation, reduced-motion support via `prefers-reduced-motion`. No specialized accommodations required beyond baseline.

## Product Roadmap Notes

Already implemented from this list:

- Password recovery through the forgot/reset password flow.
- Favorite/reference movies are used as taste signals but excluded from recommendation candidates.
- Results can be shared through a stable recommendation URL.
- Recommendation feedback is captured after results and stored alongside recommendation history.
- Signed-in feedback is converted into durable movie memory for watched, liked, not-interested, and wrong-mood signals.
- Account recommendation history is deduplicated by movie identity.

- Continue improving account foundations:
  - Profile basics: display name, avatar, and a clear account settings surface.
  - Editable saved recommendations: let users add, remove, rename, annotate, or change saved items without leaving the account page.
  - Magic-link login: let users sign in from an emailed one-time link without remembering a password.
  - Social login: support trusted providers such as Google once the local auth flow is stable.
- Loading states must be truthful and terminal. If recommendation polling hits authorization, missing-result, worker, or network failures, the UI should show an actionable error instead of returning to an earlier loading state or spinning indefinitely.
- Add an account taste profile that becomes more useful over time:
  - Make stored likes, dislikes, skipped films, watched films, and feedback inspectable and editable.
  - When movie memory grows beyond a handful of titles, replace the simple card grid with search, filters by signal, and a denser list/table mode.
  - Derive lightweight taste signals from completed quizzes, opened results, saved picks, more-picks requests, and rejected suggestions.
  - Make the taste profile inspectable and editable, so users can correct PopChoice when it learns the wrong lesson.
- Continue improving recommendation feedback:
  - Use `liked` feedback as a positive ranking signal, not only as stored memory.
  - Make feedback history visible enough for analytics/debugging without exposing internal metadata awkwardly in the product UI.
  - Use feedback for richer personalized follow-up suggestions.
- Revise the recommendation flow around learning:
  - Add a "not this" or "seen it" action that reranks alternatives without forcing the user to retake the quiz.
  - Make the transition from quiz to results resilient: one source of truth for pending, completed, failed, and retry states.
  - Consider a Tinder-style discovery mode for logged-in users: quick swipe decisions that build taste without a full quiz.
- Add watchlist and availability features:
  - Let users request a movie that is missing from the catalog.
  - Notify users when a requested movie is added or when a saved recommendation becomes available in the catalog.
  - Keep notifications opt-in and useful: account email first, richer channels later only if users ask for them.
- Explore achievements and light gamification:
  - Achievements for trying group mode, rating recommendations, building a taste profile, exploring new genres, or watching older/classic films.
  - Level/progress systems should reward useful participation, not empty clicks.
  - Gamification must remain secondary to the core promise: quickly finding a movie worth watching.
