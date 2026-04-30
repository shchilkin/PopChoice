# Design Issues

Tracked from `$impeccable critique landing page` · 2026-04-30.
Re-run `$impeccable critique landing page` after fixes to verify score improvement.

---

## P0 — Critical

- [x] **Identical card grid** (`FeaturesSection.tsx:63–96`)  
      Four feature cards with identical geometry (icon + title + desc × 4), differentiated only by accent color. The most fingerprinted AI-generated layout pattern. Violates the shared design law against identical card grids.  
      **Fix:** Asymmetric 12-column grid — AI-Powered (7 cols) + 5 Questions (5 cols), then Group Mode (5 cols, featured) + Instant Results (7 cols). Varying size breaks mechanical repetition.

---

## P1 — High

- [x] **Mascot abandonment in CtaSection** (`CtaSection.tsx:44`)  
      The hero invests in an animated SVG popcorn mascot (130px, spring animation). The CtaSection replaces it with `🎬` — a Unicode emoji. Breaks personality consistency; ends the emotional arc on a generic note. Per PRODUCT.md "Earn the personality": playfulness lives in thoughtful details, not Unicode substitutes.  
      **Fix:** Replace emoji with `<Mascot width={80} height={80} />`.

- [~] **Commitment anxiety — no quiz preview** (`HeroSection.tsx`)  
  The quiz is the entire product but the landing page gives users zero visibility into what it looks like before clicking. "5 quick questions" describes quantity, not experience. No mental model = conversion risk.  
  **Attempted fix reverted:** pill preview looked out of place. Addressed indirectly by the How It Works section inline.

---

## P2 — Medium

- [x] **Background layer debt** (`HeroSection.tsx:41–47`)  
      Four semi-transparent layers composited simultaneously: poster grid, blur/dim, radial gold tint, gradient fade, film grain, FilmParticles. On low-brightness screens stacked layers create ambient mud.  
      **Fix:** Remove film grain div (lines 41–47). The poster grid + gradient overlay carry the cinematic effect without it.

- [x] **"How it works" destination mismatch** (`HeroSection.tsx:145–163`)  
      Ghost button label: "How it works." Destination: `/about`. The FeaturesSection directly below — the actual explanation — is bypassed. Label and destination contradict each other.  
      **Fix:** Merged `HowItWorksSection` from `/about` directly into the landing page (`page.tsx`). Ghost button now scrolls to `#how-it-works` inline. Label and destination now match.

---

## Minor

- [x] **Scroll-hint bounce easing** (`HeroSection.tsx:186–191`)  
      Scroll chevron uses `bounce-soft` keyframe with `ease-in-out`. Sinusoidal bounce on UI chrome reads dated. DESIGN.md motion rule: ease out, no bounce.  
      **Fix:** Replace with opacity pulse animation (no translateY).

---

## About page — from `$impeccable critique about page` · 2026-04-30

- [x] **About page identity crisis** (`about/page.tsx`)  
      Page had no clear audience or purpose — generic "AI that gets your taste" marketing copy. Employer/recruiter visitors had no way to understand what the project is, why it was built, or who built it.  
      **Fix:** Reframed as project showcase. New hero with origin story (Scrimba AI engineering course → full-stack learning playground), GitHub and shchilkin.dev links. HowItWorksSection and TechStackSection restored. Removed purple badge.

- [x] **TechStackSection identical card grid** (`TechStackSection.tsx`)  
      Four icon+heading+desc cards in equal-size grid. Same anti-pattern as FeaturesSection, but in a context where density and specificity matter more than visual hierarchy.  
      **Fix:** Definition-list style grouped rows — category label, divider, then rows with tech name (fixed width) + rationale. No cards, no identical geometry.

- [x] **FAQSection static open cards** (`FAQSection.tsx`)  
      All FAQ answers displayed simultaneously in rounded cards — high visual weight, low scannability. Cards duplicate the TechStack anti-pattern on the same page.  
      **Fix:** `<details>`/`<summary>` accordion with chevron indicator. One answer visible at a time. Divider lines only, no cards.

- [x] **About page narrative structure** (`about/page.tsx`)  
      Page lacked a coherent story arc. FAQ was noise for a technical reader. No "What it does" section meant recruiters had no concrete product explanation before the pipeline steps.  
      **Fix:** Restructured into Why → What → How → Stack. Added "What it does" prose block (vector embedding, pgvector similarity, GPT explanations). FAQ moved to landing page (`page.tsx`) between HowItWorksSection and CTA.
