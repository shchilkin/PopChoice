---
title: 'Design Evolution Evidence'
description: 'Evidence-backed milestones in the PopChoice interface and brand.'
---

# Design Evolution Evidence

## Timeline

1. **Course exercise UI — Shipped in development (historical).** The repository
   began as a Scrimba “Embeddings and Vector Databases” project. Commit
   [`52c5b6e`](https://github.com/shchilkin/PopChoice/commit/52c5b6e) introduced
   the first single-user form UI; the project origin remains stated in
   [`README.md`](https://github.com/shchilkin/PopChoice/blob/development/README.md).
   No archival screenshot is committed, so the old look should not be recreated.

2. **Figma Make code prototype — Shipped in development (historical).** PR
   [#206](https://github.com/shchilkin/PopChoice/pull/206), whose source branch
   was `196-integrate-figma-make-interactive-prototype-and-deploy-to-railway`,
   merged a new UI and `docs/design-guidelines.md` extracted from the prototype.
   This proves a prototype-to-code integration, not the contents or continued
   availability of the original Figma file.

3. **Current product UI — Shipped in development.** The present landing, quiz,
   and result surfaces are implemented in
   [`apps/web/src/app`](https://github.com/shchilkin/PopChoice/tree/development/apps/web/src/app)
   and browser-covered by
   [`landing.spec.ts`](https://github.com/shchilkin/PopChoice/blob/development/apps/web/e2e/landing.spec.ts)
   and [`recommendation.spec.ts`](https://github.com/shchilkin/PopChoice/blob/development/apps/web/e2e/recommendation.spec.ts).
   The current design contract is [`DESIGN.md`](https://github.com/shchilkin/PopChoice/blob/development/DESIGN.md).

4. **Mascot and branding — Shipped in development.** The popcorn mascot is an
   inline SVG with an interaction/confetti wrapper. PR
   [#36](https://github.com/shchilkin/PopChoice/pull/36) records the SVG and
   mascot interaction; current source lives under
   [`components/Mascot`](https://github.com/shchilkin/PopChoice/tree/development/apps/web/src/components/Mascot).
   **Anecdotal / unverified:** the repository does not prove whether the mascot
   was redrawn in Figma or Affinity Designer. Ask the owner before naming a tool.

5. **Interactive poster hero — Shipped in development.** PR
   [#322](https://github.com/shchilkin/PopChoice/pull/322) replaced a static
   cinema image with a moving TMDB poster grid, a local cache, placeholder
   fallback, and theme-aware overlays. Current evidence:
   [`PosterBackground.tsx`](https://github.com/shchilkin/PopChoice/blob/development/apps/web/src/app/components/PosterBackground.tsx)
   and [`HeroSection.tsx`](https://github.com/shchilkin/PopChoice/blob/development/apps/web/src/app/components/HeroSection.tsx).

6. **Light and dark themes — Shipped in development.** Theme support entered in
   PR [#87](https://github.com/shchilkin/PopChoice/pull/87) and remains expressed
   through current tokens, theme hooks, and theme-aware components. Evidence:
   [`DESIGN.md`](https://github.com/shchilkin/PopChoice/blob/development/DESIGN.md),
   [`globals.css`](https://github.com/shchilkin/PopChoice/blob/development/apps/web/src/app/globals.css),
   and [`usePCTheme.ts`](https://github.com/shchilkin/PopChoice/blob/development/apps/web/src/hooks/usePCTheme.ts).

7. **Living design-system/style-guide work — Anecdotal / unverified as a
   finished product surface.** PR [#326](https://github.com/shchilkin/PopChoice/pull/326)
   added a living style guide. Current source exists under
   [`app/design-system`](https://github.com/shchilkin/PopChoice/tree/development/apps/web/src/app/design-system),
   but internal links still point to `/style-guide`, the public landing test
   explicitly expects no `Design System` navigation link, and no open tracking
   issue was found during this evidence pass. It is safe to say the repository
   contains ongoing design-system work; it is not safe to call the current
   route a finished public style guide without owner confirmation and browser QA.

## Asset policy

**Shipped in development.** Current screenshots may document the current UI.
Historical visuals must come from real commits, retained screenshots, or an
owner-provided Figma file. Do not generate a fake “before” screen or infer an
unrecorded design-tool workflow.
