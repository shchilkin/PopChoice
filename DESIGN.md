---
name: PopChoice
description: AI-powered movie recommendation engine for solo and group decisions
colors:
  gold: '#c4950a'
  gold-bright: '#f5c518'
  amber: '#d4760c'
  amber-bright: '#ff9f1c'
  bg-light: '#f7f5ee'
  bg-dark: '#09090f'
  surface-light: '#ffffff'
  surface-dark: '#13131f'
  surface-hover-light: '#f0ece2'
  text-primary-light: '#0d0d1a'
  text-secondary-light: '#424260'
  text-muted-light: '#6a6a88'
  text-primary-dark: '#f8f8ff'
  text-secondary-dark: '#8888aa'
  text-muted-dark: '#7b7b9d'
  cta-text: '#09090f'
typography:
  display:
    fontFamily: 'Oswald, sans-serif'
    fontSize: 'clamp(2rem, 5vw, 3.5rem)'
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: '0.06em'
  headline:
    fontFamily: 'Oswald, sans-serif'
    fontSize: 'clamp(1.5rem, 3vw, 2rem)'
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: '0.04em'
  title:
    fontFamily: 'Manrope, Inter, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: 'Manrope, Inter, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: 'Manrope, Inter, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: '0.02em'
rounded:
  sm: '4px'
  md: '8px'
  lg: '12px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '20px'
  xl: '32px'
components:
  button-cta:
    backgroundColor: '#f5c518'
    textColor: '{colors.cta-text}'
    rounded: '{rounded.md}'
    padding: '16px 16px'
  button-cta-hover:
    backgroundColor: '#ff9f1c'
    textColor: '{colors.cta-text}'
    rounded: '{rounded.md}'
    padding: '16px 16px'
  button-default:
    backgroundColor: '{colors.gold}'
    textColor: '{colors.text-primary-light}'
    rounded: '{rounded.md}'
    padding: '16px 16px'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.text-secondary-light}'
    rounded: '{rounded.md}'
    padding: '16px 16px'
  button-ghost-hover:
    backgroundColor: 'transparent'
    textColor: '{colors.text-primary-light}'
    rounded: '{rounded.md}'
    padding: '16px 16px'
---

# Design System: PopChoice

## 1. Overview

# PopChoice — AI Movie Finder

### The Vibe

The neighborhood cinema where the staff loves movies as much as you do. Not a multiplex algorithm churning thumbnails, not a streaming service with 400+ options — a room with good chairs, warm light, and a poster on the wall that makes you feel something before the lights even go down. PopChoice occupies this space: confident, curated, quietly thrilled about film.

The system operates in two modes — warm parchment light and cool midnight dark — both theater-appropriate, both treated as equals. Neither is an afterthought. The interface uses Oswald's cinematic authority for headlines and Manrope's warm approachability for everything conversational. Gold appears where it counts: on what you should do next, on what's been chosen, on what matters. Everywhere else, it rests.

Playfulness is earned through texture and motion, not decoration. The animated mascot, the morphing progress dots, the gold glow on the CTA — these are moments, not a mood board. The product should feel fun and unusual enough to be memorable, and immediately legible from a glance. If picking a movie feels like an event rather than a chore, the system is doing its job.

**Key Characteristics:**

- Dual-theme: warm parchment light and cool midnight dark — both intentional, both equal
- Gold as signal, never noise — the accent appears on exactly what matters
- Oswald uppercase authority paired with Manrope warm approachability
- Restrained surface depth: flat at rest, depth earned by state
- Motion in service of feedback, not spectacle

### Backoffice Direction

The backoffice is a working console, not a brand showcase. Prefer a minimal, clean, highly readable interface with direct hierarchy, compact controls, and calm surfaces. It should help an operator find the next action quickly, verify state, and move on.

- Prefer spacing, grouping, and typography over divider lines. Add horizontal rules, borders, and line breaks only when they clarify a real boundary or prevent ambiguity.
- Keep page headers quiet: title, short purpose, optional actions. Do not duplicate context badges when the product area is already named.
- Show actionable work first. Healthy or resolved state belongs in compact secondary summaries below the work queue, not as full-size panels mixed into the action list.
- Avoid decorative glow, ambient shine, or showcase effects in operational views. Reserve accent color for active navigation, warnings, repair actions, and status.
- Prefer one-line labels and copy when they remain readable. Let layout breathe with vertical spacing instead of forced line breaks.
- Treat design critiques as inputs, not source artifacts. Keep raw agent snapshots local; document lasting backoffice decisions here or in `docs/UI-DEVELOPMENT.md`.

## 2. Colors: The Marquee Palette

A committed accent strategy: gold and amber carry the brand, warm and cool neutrals carry the surfaces. Nothing competes with the accent; everything else steps back.

### Primary

- **Projectionist's Gold** (#c4950a light / #f5c518 dark): The brand accent. CTAs, active nav states, progress fills, the logo gradient, focus rings. In light mode — antique, earned. In dark mode — bright as a marquee at night. Never decorative; always functional.
- **Gold Bright** (#f5c518): The CTA gradient start. Used in `--pc-cta`, `--pc-progress`, and the dark mode logo. Brighter and bolder than the base gold.

### Secondary

- **Amber Reel** (#d4760c light / #ff9f1c dark): The gradient partner to gold. Appears as the trailing color in CTA gradients (`linear-gradient(135deg, #f5c518, #ff9f1c)`), accent bars, and progress fills. Never used in isolation on interactive elements — always paired with gold in a gradient.

### Neutral

- **Warm Parchment** (#f7f5ee): Light mode base background. Tinted cream — warm and analog, like a lobby program. Not white. Never white.
- **Midnight Screen** (#09090f): Dark mode base background. Near-black with a blue-violet undertone. The deepest surface.
- **Projection White** (#ffffff): Light mode card surface. Lifts slightly above parchment.
- **Dark Stage** (#13131f): Dark mode card surface. Lifts slightly above midnight.
- **Director's Ink** (#0d0d1a): Light mode primary text. Near-black with a blue tint — not pure black.
- **Ghost White** (#f8f8ff): Dark mode primary text. Near-white with a blue tint.
- **Cast Credits** (#424260): Light mode secondary text. Periwinkle-slate.
- **Supporting Role** (#6a6a88 light / #7b7b9d dark): Muted text, captions, footer. WCAG AA compliant on both base backgrounds.

**The One Accent Rule.** Gold appears on ≤10% of any given screen in its full-value form. Its rarity is what makes it read as signal. Gold tints (`--pc-gold-subtle`, `--pc-gold-tint`) exist for hover backgrounds and AI content blocks — these are background washes, not accent uses.

**The No-Pure-Extremes Rule.** Never `#000000` or `#ffffff`. Director's Ink and Ghost White are the terminals. Every neutral is tinted toward the brand hue.

## 3. Typography

**Display Font:** Oswald (400, 500, 600, 700 — latin + cyrillic)
**Body Font:** Manrope (400, 500, 600, 700 — latin + cyrillic), Inter as fallback

**Character:** Oswald brings condensed, uppercase authority — it announces; it doesn't ask. Manrope brings warmth and readability to everything conversational. The pairing is the Cinematic Concierge in typographic form: confident heading, warm voice.

### Hierarchy

- **Display** (Oswald 600, clamp(2rem, 5vw, 3.5rem), lh 1.1, ls 0.06em, uppercase): Hero headlines, marquee statements. One per page.
- **Headline** (Oswald 500, clamp(1.5rem, 3vw, 2rem), lh 1.2, ls 0.04em, uppercase): Section headers, quiz step titles.
- **Title** (Manrope 700, 1.25rem, lh 1.3): Card titles, modal headers, emphasized UI labels.
- **Body** (Manrope 400, 1rem, lh 1.65, max 65–75ch): Paragraph text, descriptions, feature copy.
- **Label** (Manrope 600, 0.875rem, lh 1.4, ls 0.02em): Chips, nav items, badges, table headers.

**The Uppercase Authority Rule.** Oswald is always uppercase and letter-spaced (minimum 0.04em). Lowercase Oswald defeats its purpose entirely — if you need a lowercase display treatment, switch to Manrope bold.

**The Single Display Rule.** One Display-level element per page. Hierarchy collapses when everything shouts.

## 4. Elevation

PopChoice uses a two-surface system — base background and a slightly lifted card surface — with purposeful shadows that appear as contextual depth, not decoration. The system is flat at rest; elevation emerges with state.

In light mode, shadows are soft and diffuse (`rgba(0,0,0,0.1)`), barely present. In dark mode, shadows are deeper and more atmospheric (`rgba(0,0,0,0.5)`) — the dark theater makes depth more legible and more dramatic. The brand accent (gold) creates its own shadow vocabulary for CTA elements: a warm glow that pulses on hover.

### Shadow Vocabulary

- **Card ambient** (`0 20px 50px rgba(0,0,0,0.1)` light / `0 40px 80px rgba(0,0,0,0.5)` dark): Applied to content cards. Suggests gentle lift off the base surface without drama.
- **CTA glow rest** (`0 4px 20px rgba(196,149,10,0.3), 0 2px 8px rgba(196,149,10,0.15)`): Gold-tinted shadow under CTA buttons at rest. Unique to the CTA variant — do not apply to other buttons.
- **CTA glow hover** (`0 8px 30px rgba(196,149,10,0.4), 0 4px 16px rgba(196,149,10,0.2)`): CTA shadow on hover. The button appears to levitate slightly.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. The card shadow is a quiet hint, not a statement. Only the CTA carries an expressive shadow. Everything else is tonal layering.

**The Gold Glow Rule.** The gold-tinted shadow exists only on the CTA button. Do not apply `--pc-cta-shadow` to cards, chips, nav items, or decorative elements.

## 5. Components

### Component Reuse Policy

Prefer existing components before creating new UI. Start with shared
components from `packages/ui` and `apps/web/src/components`; if the pattern
already exists there, extend that component conservatively instead of
recreating its markup, styling, interaction states, or accessibility behavior
inside a route.

Prefer shared primitives over in-app one-offs. Route- or feature-local
components should compose shared primitives and own only the workflow-specific
layout, copy, and state. Create a new local primitive only when no existing
shared component can express the interaction without making its API misleading,
overloaded, or inaccessible.

Promote local components when reuse becomes real. If a page-local control
appears on a second surface, move it toward the shared component layer with
tokens, stories, and accessibility behavior instead of copying it.

### Buttons

Buttons are the most-touched element in the quiz flow — they need to feel satisfying, not just functional.

- **Shape:** Gently rounded (8px radius / `rounded-lg`)
- **CTA:** Gold-to-amber gradient (`linear-gradient(135deg, #f5c518, #ff9f1c)`), near-black text (`#09090f`), 16px padding all sides, Manrope bold 1.25rem. Gold glow shadow at rest. Hover: opacity 90%, shadow deepens. Active: scale 95%.
- **Default:** Solid gold (`--pc-gold`) background, dark text. Same shape and padding. No glow shadow — glow is CTA-only.
- **Ghost:** Transparent background, 1px border (`--pc-bd2`, rgba(0,0,0,0.09)), muted text (`--pc-t2`). Hover: border strengthens to `--pc-bd4`, text brightens to `--pc-t1`.
- **Disabled:** 50% opacity, `cursor-not-allowed`. Applies to all variants.
- **Transition:** `transition-all 200ms` on all variants.

### Cards / Containers

- **Corner Style:** Gently rounded (8–12px, `rounded-lg` to `rounded-xl`)
- **Background:** `--pc-surface` (#fff light / #13131f dark)
- **Shadow:** `--pc-card-shadow` — ambient, mode-appropriate
- **Border:** 1px `--pc-bd2` (rgba(0,0,0,0.09) light / rgba(255,255,255,0.08) dark)
- **Internal Padding:** 20px horizontal, 12–14px vertical

**The No-Nested-Cards Rule.** Cards do not contain cards. If content needs a container within a card, use a tinted background (`--pc-gold-subtle`, `--pc-surface-hover`) or a border, not a nested card.

### Chips / Badges

- **Neutral chip:** `--pc-chip-bg`, `--pc-chip-bd`, and `--pc-chip-text`. Use for inactive filters, secondary actions, and low-emphasis metadata.
- **Selected chip:** `--pc-chip-selected-bg`, `--pc-chip-selected-bd`, and `--pc-chip-selected-text`. Use for saved, selected, copied, or committed states where the user needs unmistakable confirmation.
- **Poster overlay chip:** `--pc-poster-chip-bg`, `--pc-poster-chip-bd`, `--pc-poster-chip-text`, and `--pc-poster-chip-accent`. Use on image previews where gold text on translucent gold can disappear into the artwork.

**The Context Rule.** Do not reuse `--pc-gold-subtle` as a universal pill background. Inline chips, selected states, and image overlays have different contrast needs.

### Inputs / Fields

- **Style:** Filled, 12px radius (`rounded-xl`), `--pc-surface` background, 1px border `--pc-bd2`
- **Padding:** 16px horizontal, 12px vertical
- **Focus:** Border-color shifts to indicate state. No outline — `outline-none` with a visible border change.
- **Transition:** `transition-all 200ms`
- **Error / Disabled:** Not globally systematized — handled per-context in the quiz flow.

### Navigation

- **Position:** Sticky, `z-50`
- **Background:** Frosted: `--pc-header-bg` (rgba 0.85–0.92 on base color) + `backdrop-filter: blur(16px)`
- **Border-bottom:** 1px `--pc-bd1` (rgba(0,0,0,0.06))
- **Logo:** Oswald 600, uppercase, 1.4rem, letter-spacing 0.12em, solid gold text. Emphasis comes from weight and spacing, not gradients.
- **Nav links (active):** 12px radius pill, `--pc-gold-subtle` background, `--pc-gold-text` color
- **Nav links (inactive):** Transparent, `--pc-t3` color. Hover: slight background tint.
- **Transition:** `transition-colors 200ms`

### Progress Dots (Signature Component)

The quiz step indicator. Dots morph between states — the shape change is the signal, not just a color change.

- **Inactive:** 8×8px circle, `--pc-bd2` fill. Quiet — doesn't demand attention.
- **Active:** 24×8px pill, gold-to-amber gradient. The current step is unmistakable.
- **Completed:** 24×8px pill, semi-transparent gold (`rgba(245,197,24,0.5)`). Present but stepped back.
- **Transition:** `transition-all 300ms` — slightly slower than button transitions for a more deliberate, satisfying feel.

### AgeRatingChip

- **Shape:** Pill (`rounded-full`), inline-flex
- **Typography:** Manrope semibold, size-responsive (xs / sm / base)
- **Light mode:** Solid fill — each rating has its own color role (green/blue/orange/red/grey)
- **Dark mode:** Outline style — same hue family, dark tinted background + colored border + lighter text
- **Transition:** `transition-colors 200ms`

## 6. Do's and Don'ts

### Do:

- **Do** use gold (`--pc-gold`, `--pc-gold-bright`) on ≤10% of any given screen in its full-value form — CTAs, active states, progress indicators, the logo.
- **Do** use Oswald uppercase with letter-spacing at minimum 0.04em on all display and headline text.
- **Do** maintain warm parchment light mode (`#f7f5ee`) and cool midnight dark mode (`#09090f`) with equal visual care.
- **Do** apply the gold glow shadow (`--pc-cta-shadow`) exclusively to the CTA button variant.
- **Do** animate state changes with 200ms ease-out. Progress dots use 300ms for deliberate weight.
- **Do** cap body copy at 65–75ch line length.
- **Do** treat solo and group mode entry points with equal visual weight on the landing page.

### Don't:

- **Don't** copy streaming platform aesthetics: dark backgrounds with red or blue accents (Netflix, Disney, Max). Category-reflex palettes are prohibited.
- **Don't** use Amazon-style "you might also like" card grids — transactional, invisible, soulless.
- **Don't** over-design into heavy editorial film-festival territory — alienating, prioritizes aesthetic over instant comprehension.
- **Don't** use gradient text. Use a solid accent color with clear weight and spacing instead.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards, list items, or callouts.
- **Don't** use Oswald in lowercase or without letter-spacing — it reads as an error, not a design choice.
- **Don't** layer gold on gold. One gold-role element per visual cluster. When in doubt, the CTA is the gold element; everything else defers.
- **Don't** use `#000000` or `#ffffff`. Director's Ink (`#0d0d1a`) and Ghost White (`#f8f8ff`) are the terminals.
- **Don't** build identical-sized card grids with icon + heading + paragraph repeated in a uniform grid. Find a layout with hierarchy.
