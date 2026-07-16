---
title: 'PopChoice Design Guidelines'
---

# PopChoice Design Guidelines

Design system reference extracted from the PopChoice UI prototype. Use these tokens, patterns, and conventions when building or modifying any PopChoice interface.

---

## Brand Identity

### Personality

| Trait         | Description               |
| ------------- | ------------------------- |
| **Playful**   | Fun, popcorn energy       |
| **Confident** | AI-powered, curated picks |
| **Cinematic** | Dark theatre aesthetic    |

### Mascot

The PopcornMascot is an inline SVG of a smiling popcorn bucket with animated popping kernels and decorative stars. Use it at three sizes:

| Context         | Size   | Animated            |
| --------------- | ------ | ------------------- |
| Hero / landing  | 130 px | Yes (bob animation) |
| General display | 80 px  | Optional            |
| Navigation      | 32 px  | No                  |

### Wordmark

- **Font:** Oswald, uppercase, wide letter-spacing (`0.12em` nav, `0.04–0.07em` hero)
- **Fill:** Gold-to-amber gradient (`linear-gradient(90deg, #F5C518, #FF9F1C)`) applied via `background-clip: text`
- Hero variant uses a white-to-gold-to-amber gradient that adapts to the active theme

### Voice & Copy Guidelines

PopChoice speaks like **the Cinematic Concierge** — a confident, culturally-sharp friend who always knows what to watch. Every word should feel like it belongs in a dark theatre, not a SaaS dashboard.

| Category                  | Guideline                                                                                        | ✅ Do                                                                        | ❌ Don't                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Role & Identity**       | You are the voice of PopChoice. Confident, cinema-obsessed, here to end the scrolling nightmare. | "Grab your popcorn. I've found the perfect match for your night."            | "I am an AI assistant programmed to query the movie database."                |
| **Tone of Voice**         | Playful, bold, modern. Like that one friend who always knows what to watch.                      | "Stop scrolling in vain. Let's find a film that actually matches your vibe." | "Please input your preferences so the algorithm can process your request."    |
| **Pacing & Flow**         | Short, punchy, action-oriented. Cut the fluff. Get to the point.                                 | "5 questions. 60 seconds. Your perfect movie."                               | "By answering these five comprehensive questions, you will allow our system…" |
| **Vocabulary**            | Cinematic magic words. Avoid tech jargon and corporate speak.                                    | vibe, match, masterpiece, magic, perfect pick, cinematic, mood               | algorithm, vector search, process, output, user input, system                 |
| **Aesthetic Translation** | Mirror the dark-theatre UI — sleek but energetic. Use emojis strategically, not overwhelmingly.  | "Lights out. Your next favorite film is waiting. ✨🎬"                       | "Here are the results of your search query:"                                  |
| **Group Dynamics**        | Frame Group Mode around solving the argument, not the tech.                                      | "A pick everyone in the room will actually agree on. No arguing required."   | "This mode allows multiple users to find a statistical middle ground."        |
| **CTAs**                  | Action-first. Make users want to click. Focus on the result or the fun.                          | "Find My Movie", "Start the Quiz", "Let's Go"                                | "Submit", "Search", "Next Page"                                               |

> **Translation note:** When localising, preserve the _energy_ of the English copy — not just the meaning. A natural-sounding phrase in the target language beats a literal translation every time.

---

## Theme System

PopChoice supports **dark** (default) and **light** modes. The theme is toggled by adding/removing the `.pc-light` class on `<html>`. Theme preference persists in `localStorage` under `pc-theme`.

All visual values are driven by CSS custom properties prefixed with `--pc-*`, defined in `:root` (dark) and overridden in `.pc-light` (light).

### Core Token Table

| Token                   | Dark                                                              | Light                                                              | Usage                                        |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| `--pc-bg`               | `#09090F`                                                         | `#F7F5EE`                                                          | Page background                              |
| `--pc-surface`          | `#13131F`                                                         | `#FFFFFF`                                                          | Cards, panels, inputs                        |
| `--pc-surface-hover`    | `#1A1A30`                                                         | `#F0ECE2`                                                          | Hovered cards / interactive panels           |
| `--pc-surface-deep`     | `#1C1C2E`                                                         | `#E8E3D6`                                                          | Poster placeholders, skeleton loaders        |
| `--pc-header-bg`        | `rgba(9,9,15,0.85)`                                               | `rgba(247,245,238,0.92)`                                           | Sticky nav (+ `backdrop-filter: blur(16px)`) |
| `--pc-fog`              | `#09090F`                                                         | `#F7F5EE`                                                          | Edge-fade gradient color                     |
| `--pc-t1`               | `#F8F8FF`                                                         | `#0D0D1A`                                                          | Primary text (headings, labels)              |
| `--pc-t2`               | `#8888AA`                                                         | `#424260`                                                          | Secondary text (body copy, subtitles)        |
| `--pc-t3`               | `#5A5A78`                                                         | `#6A6A88`                                                          | Tertiary text (captions, meta)               |
| `--pc-t4`               | `#3D3D55`                                                         | `#9090B0`                                                          | Muted / disabled text                        |
| `--pc-t5`               | `#2D2D45`                                                         | `#B0B0C8`                                                          | Barely-there text                            |
| `--pc-bd1`              | `rgba(255,255,255,0.06)`                                          | `rgba(0,0,0,0.06)`                                                 | Subtle border                                |
| `--pc-bd2`              | `rgba(255,255,255,0.08)`                                          | `rgba(0,0,0,0.09)`                                                 | Default border                               |
| `--pc-bd3`              | `rgba(255,255,255,0.10)`                                          | `rgba(0,0,0,0.11)`                                                 | Emphasis border                              |
| `--pc-bd4`              | `rgba(255,255,255,0.12)`                                          | `rgba(0,0,0,0.14)`                                                 | Strong border                                |
| `--pc-gold`             | `#F5C518`                                                         | `#C4950A`                                                          | Primary brand accent                         |
| `--pc-amber`            | `#FF9F1C`                                                         | `#D4760C`                                                          | Secondary warm accent                        |
| `--pc-footer`           | `#3D3D55`                                                         | `#9090B0`                                                          | Footer text                                  |
| `--pc-footer-bd`        | `rgba(255,255,255,0.04)`                                          | `rgba(0,0,0,0.06)`                                                 | Footer border                                |
| `--pc-card-shadow`      | `0 40px 80px rgba(0,0,0,0.5)`                                     | `0 20px 50px rgba(0,0,0,0.1)`                                      | Main card lift shadow                        |
| `--pc-cta-shadow`       | `0 0 40px rgba(245,197,24,0.35), 0 8px 32px rgba(245,197,24,0.2)` | `0 4px 20px rgba(196,149,10,0.3), 0 2px 8px rgba(196,149,10,0.15)` | CTA resting glow                             |
| `--pc-cta-shadow-hover` | `0 0 60px rgba(245,197,24,0.5), 0 12px 40px rgba(245,197,24,0.3)` | `0 8px 30px rgba(196,149,10,0.4), 0 4px 16px rgba(196,149,10,0.2)` | CTA hover glow                               |

### CTA Gradients (theme-independent)

| Token             | Value                                       | Usage                  |
| ----------------- | ------------------------------------------- | ---------------------- |
| `--pc-cta`        | `linear-gradient(135deg, #F5C518, #FF9F1C)` | Main action buttons    |
| `--pc-cta-h`      | `linear-gradient(90deg, #F5C518, #FF9F1C)`  | Horizontal CTA variant |
| `--pc-accent-bar` | `linear-gradient(180deg, #F5C518, #FF9F1C)` | Section accent lines   |
| `--pc-progress`   | `linear-gradient(90deg, #F5C518, #FF9F1C)`  | Loading progress bar   |

---

## Color System

### Accent / Feature Colors

| Name         | Hex       | Usage                                                 |
| ------------ | --------- | ----------------------------------------------------- |
| Gold         | `#F5C518` | Primary brand accent — CTAs, highlights, star ratings |
| Amber        | `#FF9F1C` | Secondary warm accent — gradient pair with gold       |
| Purple       | `#8B5CF6` | Group mode, drama genre                               |
| Purple Light | `#A78BFA` | Purple tint, NEW badge text                           |
| Teal         | `#14B8A6` | Sci-Fi genre, ≥95% match badge                        |
| Red          | `#EF4444` | Thriller genre, dark tone                             |
| Pink         | `#EC4899` | Romance genre                                         |
| Green        | `#10B981` | Adventure genre, success states                       |
| Blue         | `#60A5FA` | Documentary genre                                     |
| Gray         | `#6B7280` | Horror genre, neutral                                 |

### Genre Color Map

| Genre       | Color     |
| ----------- | --------- |
| Action      | `#FF9F1C` |
| Comedy      | `#F5C518` |
| Drama       | `#8B5CF6` |
| Sci-Fi      | `#14B8A6` |
| Thriller    | `#EF4444` |
| Romance     | `#EC4899` |
| Horror      | `#6B7280` |
| Adventure   | `#10B981` |
| Animation   | `#A78BFA` |
| Documentary | `#60A5FA` |

### Similarity Match Badge Colors

| Threshold | Color            |
| --------- | ---------------- |
| ≥ 95%     | Teal `#14B8A6`   |
| ≥ 90%     | Gold `#F5C518`   |
| ≥ 85%     | Amber `#FF9F1C`  |
| < 85%     | Purple `#8B5CF6` |

---

## Typography

### Font Stack

| Role               | Family                                      | Import       |
| ------------------ | ------------------------------------------- | ------------ |
| Display / Headings | **Oswald** (semibold, uppercase)            | Google Fonts |
| Body / UI          | **Manrope** (primary), **Inter** (fallback) | Google Fonts |

```css
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
```

### Type Scale

| Name           | Size                        | Font    | Usage                        |
| -------------- | --------------------------- | ------- | ---------------------------- |
| Hero           | `clamp(3.5rem, 10vw, 6rem)` | Oswald  | Landing page title           |
| Page H1        | `2.2rem`                    | Oswald  | Quiz / section headings      |
| Subhead        | `2rem`                      | Oswald  | Loading page, between-person |
| Section H2     | `1.6rem`                    | Oswald  | About page sections          |
| Nav Wordmark   | `1.4rem`                    | Oswald  | Header logo text             |
| Movie Title    | `clamp(1.8rem, 5vw, 3rem)`  | Oswald  | Result card main title       |
| Expanded Title | `1.3rem`                    | Oswald  | Suggestion expanded view     |
| Hero Body      | `1.1rem`                    | Manrope | Landing page subtitle        |
| Body           | `1rem` / `0.95rem`          | Manrope | Standard paragraphs          |
| Description    | `0.88rem`                   | Manrope | AI descriptions, tips        |
| Meta           | `0.82rem`                   | Manrope | Card meta, captions          |
| Small          | `0.78rem`                   | Manrope | Star ratings, sub-labels     |
| Nano           | `0.72rem`                   | Manrope | Section labels, token labels |
| Eyebrow        | `0.65rem`                   | Manrope | Uppercase eyebrow labels     |

### Typography Conventions

- **Oswald** is always uppercase, semibold (`600`), with wide letter-spacing (`0.04em`–`0.12em`).
- Body text uses `font-weight: 400` (normal) or `500` (medium). Bold labels use `600`–`700`.
- Line height: `1` for display headings, `1.1`–`1.2` for subheads, `1.5`–`1.75` for body copy.
- Base font size is `16px` (`var(--font-size)`).

---

## Spacing & Layout

### Border Radius

| Token          | Value  | Usage                                         |
| -------------- | ------ | --------------------------------------------- |
| `rounded-xl`   | 12px   | Badges, inputs, icon containers, theme toggle |
| `rounded-2xl`  | 16px   | Cards, quiz panels, buttons                   |
| `rounded-3xl`  | 24px   | Main movie recommendation card                |
| `rounded-full` | 9999px | Pills, progress dots, avatar circles          |

### Border Styles

| Name        | Value                             | Usage                                |
| ----------- | --------------------------------- | ------------------------------------ |
| Subtle      | `1px solid var(--pc-bd1)`         | Default card/panel borders           |
| Default     | `1px solid var(--pc-bd2)`         | Interactive element borders          |
| Emphasis    | `1px solid var(--pc-bd4)`         | More visible dividers                |
| Gold Accent | `1px solid rgba(245,197,24,0.25)` | Brand badge borders                  |
| Gold Hover  | `1px solid rgba(245,197,24,0.4)`  | Active/hovered gold states           |
| Selected    | `1.5px solid {color}60`           | Selected quiz option (dynamic color) |
| Dashed Add  | `1px dashed var(--pc-bd4)`        | "Add another person" button          |

### Shadow & Glow

| Name             | Value                             | Usage                          |
| ---------------- | --------------------------------- | ------------------------------ |
| CTA Glow         | `var(--pc-cta-shadow)`            | Primary CTA resting state      |
| CTA Glow Hover   | `var(--pc-cta-shadow-hover)`      | Primary CTA hovered            |
| Card Shadow      | `var(--pc-card-shadow)`           | Main movie recommendation card |
| Active Card Glow | `0 0 30px rgba(245,197,24,0.1)`   | Selected carousel item         |
| Focus Ring       | `0 0 0 3px rgba(245,197,24,0.06)` | Input focus state              |

### Layout Patterns

- Max content width: `max-w-5xl` (landing features), `max-w-3xl` (about), `max-w-xl` (quiz), `max-w-md` (intro/group setup), `max-w-sm` (loading)
- Section padding: `px-5 py-12` to `px-5 py-20`
- Card padding: `p-5` to `p-6`
- Gap between cards: `gap-4` to `gap-6`
- The page uses a flex column layout: sticky header → flex-1 main → footer

---

## Gradients

| Name               | Value                                                                                             | Usage                       |
| ------------------ | ------------------------------------------------------------------------------------------------- | --------------------------- |
| Primary CTA        | `linear-gradient(135deg, #F5C518, #FF9F1C)`                                                       | Main action buttons         |
| Hero Title (dark)  | `linear-gradient(135deg, #FFFFFF 0%, #F5C518 60%, #FF9F1C 100%)`                                  | Landing wordmark            |
| Hero Title (light) | `linear-gradient(135deg, #0D0D1A 0%, #C4950A 55%, #D4760C 100%)`                                  | Landing wordmark            |
| Purple Action      | `linear-gradient(135deg, #8B5CF6, #6D28D9)`                                                       | Group mode CTA              |
| Accent Bar         | `linear-gradient(180deg, #F5C518, #FF9F1C)`                                                       | Section accent lines        |
| More Suggestions   | `linear-gradient(180deg, #8B5CF6, #14B8A6)`                                                       | Secondary section bars      |
| Progress Bar       | `linear-gradient(90deg, #F5C518, #FF9F1C)`                                                        | Loading progress            |
| Cinema Radial      | `radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,197,24,0.06) 0%, transparent 70%)`          | Subtle hero background glow |
| Page Fade          | `linear-gradient(180deg, var(--pc-fog) 0%, transparent 30%, transparent 70%, var(--pc-fog) 100%)` | Hero image overlay          |

---

## Components

### Buttons

| Variant               | Background                                  | Text Color     | Weight | Shape                                 | Extras                                |
| --------------------- | ------------------------------------------- | -------------- | ------ | ------------------------------------- | ------------------------------------- |
| **Primary CTA**       | `var(--pc-cta)`                             | `#09090F`      | 700    | `rounded-2xl`, `px-8 py-4`            | Golden glow shadow, `active:scale-95` |
| **Group Mode**        | `linear-gradient(135deg, #8B5CF6, #6D28D9)` | `#F8F8FF`      | 600    | `rounded-2xl`, `px-6 py-3`            | —                                     |
| **Secondary / Ghost** | `var(--pc-bd1)` or transparent              | `var(--pc-t2)` | 400    | `rounded-2xl`, `px-6 py-4`            | `1px solid var(--pc-bd2)` border      |
| **Back / Tertiary**   | Ghost bg                                    | `var(--pc-t2)` | 400    | `rounded-xl`, `py-3`                  | Border, full-width in quiz            |
| **Icon Button**       | `var(--pc-bd2)`                             | `var(--pc-t1)` | —      | `rounded-full`, `w-8 h-8` / `w-9 h-9` | Border                                |

### Badges & Pills

- **Brand Badge:** Uppercase tracking-widest, gold tint bg + gold border, Sparkles icon
- **Match Badge:** `{color}18` bg + `{color}35` border, Sparkles icon + "XX% match"
- **Neutral Chip:** `var(--pc-chip-bg)` bg + `var(--pc-chip-bd)` border, `var(--pc-chip-text)` text, `rounded-full`
- **Selected Chip:** `var(--pc-chip-selected-bg)` bg + `var(--pc-chip-selected-bd)` border, `var(--pc-chip-selected-text)` text. Use for saved, copied, selected, and committed feedback states.
- **Poster Overlay Chip:** `var(--pc-poster-chip-bg)` bg + `var(--pc-poster-chip-bd)` border, `var(--pc-poster-chip-text)` text, optional `var(--pc-poster-chip-accent)` icon. Use on poster/image previews instead of gold-on-gold translucent pills.
- **Genre Pill:** Use the neutral chip treatment unless the genre itself carries a semantic color.
- **NEW Badge:** `rgba(139,92,246,0.15)` bg, `#A78BFA` text, `rounded-full`
- **AI Pick Label:** Poster overlay chip with gold icon and light text

### Cards

- **Feature Card:** `var(--pc-surface)` bg, `var(--pc-bd1)` border, `rounded-2xl`, colored icon container (`{color}18` bg)
- **Quiz Option (unselected):** `var(--pc-surface)` bg, `var(--pc-bd2)` border, hover changes to `var(--pc-surface-hover)` + colored border
- **Quiz Option (selected):** `{color}08` bg, `1.5px solid {color}50` border, `0 0 20px {color}18` glow, checkmark indicator
- **Main Movie Card:** `rounded-3xl`, `var(--pc-card-shadow)`, image with gradient overlay, title overlay at bottom
- **Suggestion Card:** `rounded-2xl`, `min-width: 220px`, image top + content bottom, `whileHover={{ y: -4 }}`
- **AI Insight Box:** Subtle gold tint bg, gold-tinted border, "Why this film" eyebrow label with Sparkles icon

### Inputs

- **Default:** `var(--pc-bg)` bg, `var(--pc-bd2)` border, `rounded-2xl`, `px-5 py-4`
- **Focus:** Gold border (`rgba(245,197,24,0.4)`) + focus ring (`0 0 0 3px rgba(245,197,24,0.06)`)
- **Group input focus:** Purple border (`rgba(139,92,246,0.5)`)

### Progress Indicators

- **Quiz Dots:** 4 dots; completed = `rgba(245,197,24,0.5)`, current = gold-amber gradient (wider, 24px), upcoming = `var(--pc-bd2)`, all `h-2 rounded-full`
- **Loading Bar:** `h-1.5 rounded-full`, gold-amber gradient fill, `var(--pc-bd2)` track
- **Section Accent Bar:** `w-1.5 h-5 rounded-full`, vertical gradient strip next to section labels

### Navigation

- Sticky `top-0 z-50` header
- `backdrop-filter: blur(16px)` + `var(--pc-header-bg)` for glassmorphism
- Bottom border: `1px solid var(--pc-bd1)`
- Logo left, nav links + theme toggle + CTA right
- Active nav link: gold text + gold-tinted bg
- Theme toggle: `w-9 h-9 rounded-xl`, ghost bg + border

### Footer

- Centered, `py-5`, `text-xs`
- `var(--pc-footer)` text, `var(--pc-footer-bd)` top border
- Copy: "Made with 🍿 by PopChoice — AI Movie Recommendations"

---

## Motion & Animation

PopChoice uses **Framer Motion** (`motion/react`) for all page transitions and micro-interactions.

### Animation Tokens

| Name              | Config                                                           | Usage                           |
| ----------------- | ---------------------------------------------------------------- | ------------------------------- |
| **Page Enter**    | `opacity: 0→1, y: 20→0, duration: 0.5s`                          | Default page section entrance   |
| **Hero Spring**   | `opacity: 0→1, scale: 0.5→1, y: 30→0, spring stiffness: 200`     | Mascot / bold element entry     |
| **Scroll Reveal** | `whileInView, opacity: 0→1, y: 30→0, once: true, duration: 0.6s` | Below-fold content              |
| **Stagger Delay** | `delay: i * 0.1s`                                                | Sequential card/feature reveals |
| **Quiz Slide**    | `x: ±60→0, opacity: 0→1` with direction awareness                | Question step transitions       |
| **Tip Swap**      | `opacity: 0→1, y: 8→0` / exit `y: 0→-8`, `duration: 0.4s`        | Loading screen text rotation    |
| **Hover Lift**    | `whileHover={{ y: -4 }}, whileTap={{ scale: 0.97 }}`             | Suggestion cards                |
| **Button Press**  | `active:scale-95` (CSS)                                          | All interactive buttons         |
| **CTA Hover**     | `translateY(-2px)` + glow shadow increase                        | Primary CTA mouse enter         |

### CSS Keyframe Animations

```css
/* Mascot gentle float */
@keyframes mascot-bob {
  0%,
  100% {
    transform: translateY(0px) rotate(-1deg);
  }
  50% {
    transform: translateY(-6px) rotate(1deg);
  }
}

/* Hero background particles */
@keyframes float-up {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 0.3;
  }
  100% {
    transform: translateY(-110vh) rotate(360deg);
    opacity: 0;
  }
}
```

### Transition Defaults

- Interactive hover/focus: `transition-all duration-200`
- Theme transitions (bg, color, border): `transition: background 0.3s, color 0.3s`
- Image fade-in: `transition: opacity 0.4s–0.7s`

---

## Page Patterns

### Landing Page

1. Full-viewport hero with background image (low opacity), radial glow overlay, floating particles
2. Film grain texture SVG overlay at `opacity: 0.03`
3. Badge → Mascot → Gradient title → Subtitle → CTA pair (primary + ghost) → Social proof line
4. Scroll-to features section: 4-column grid of feature cards
5. Mid-page visual break with background image + gradient fade

### Quiz Flow

1. **Match depth:** Fast Pick vs. Normal Match (two large option cards)
2. **Audience:** Solo, Duo, or Group
3. **Duo/Group setup:** two names for Duo; three to six for Group
4. **Questions:** animated slide transitions, progress dots, and step counter
   - Fast Pick: intent, hard avoids, discovery appetite
   - Normal Match: optional reference movie, era, mood, tone, discovery appetite,
     hard avoids, optional actor
5. **Between persons:** same-device hand-off screen for Duo/Group
6. **Navigation:** Back/Next buttons; Next is disabled until required input is valid

Multi-device rooms, invite links, QR codes, readiness state, and projector mode
are future product direction and are not part of this shipped pattern.

### Loading Page

- Centered layout, animated film reel with popcorn kernel ring
- Rotating tip text with `AnimatePresence`
- Progress bar 0→100% over ~3.8 seconds
- "Did you know?" fun fact card fades in after 1.5s delay

### Results Page

- "Top Pick" main movie card: large image, gradient overlay, match badge, AI pick label
- AI-written description in gold-tinted insight box
- "More suggestions" horizontal scrollable carousel of 5 smaller cards
- Expandable detail view on suggestion click
- Action buttons: "Start Over" (ghost) + "New Quiz" (primary CTA)

### About Page

- "How it works" 4-step vertical timeline with icons and descriptions
- "Under the hood" tech stack 2×2 grid
- FAQ section with Q&A cards

---

## Accessibility Notes

- All interactive elements have visible hover/focus states
- Gold accent colors meet WCAG contrast against dark backgrounds
- Theme toggle has a descriptive `title` attribute
- Buttons use `active:scale-95` for tactile feedback
- Images have `alt` text
- Font sizes use relative units (`rem`, `clamp()`) for scalability
