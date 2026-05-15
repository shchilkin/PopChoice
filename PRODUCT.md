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

- Avoid recommending a film the user explicitly mentioned as a favorite or reference title. That signal should shape taste, not become the answer; in most cases the user has already seen it.
- Improve the results share card so a user can create and copy a stable share link. Social sharing can follow later, but the core need is "send this recommendation to someone" without friction.
- Loading states must be truthful and terminal. If recommendation polling hits authorization, missing-result, worker, or network failures, the UI should show an actionable error instead of returning to an earlier loading state or spinning indefinitely.
