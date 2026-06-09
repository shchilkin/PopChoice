---
title: UI Development
---

# UI Development

PopChoice UI work uses one shared design workshop with app-specific stories and a small shared
component package. Keep the workflow incremental: document the contract, add stories near the code
that owns the workflow, then extract primitives only when reuse is real.

## Storybook Topology

Use one Storybook runner for the monorepo. The existing runner lives in `apps/web` and should load:

- `apps/web/src/**/*.stories.*`
- `apps/backoffice/src/**/*.stories.*`
- `packages/ui/src/**/*.stories.*`

This is a normal Storybook setup: stories are discovered by glob, so the runner can document
components from multiple workspaces. The constraints are operational rather than conceptual:

- Stories must not depend on live production services.
- App-specific providers, CSS, and mocks should be opt-in per story or decorator.
- Shared primitives belong in `packages/ui`; domain workflows stay in their owning app.
- Backoffice stories should cover dense operator states: long movie names, missing TMDB ids,
  unavailable queue data, bulk confirmation open, failed jobs, and mobile/narrow widths.

If the single runner becomes too heavy, split later by package composition rather than duplicating
the whole setup up front.

## Shared UI Package Direction

`packages/ui` contains source-owned, domain-free primitives that can be consumed by both `apps/web`
and `apps/backoffice`. Keep it dependency-light and extract only reusable interface atoms here:

```txt
packages/ui
├── src
│   ├── badge.tsx
│   ├── button.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── utils.ts
│   └── storybook
└── package.json
```

Use package exports such as:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./button": "./src/button.tsx",
    "./badge": "./src/badge.tsx"
  }
}
```

Apps that render shared primitives must include `packages/ui/src` in Tailwind source scanning and,
for Next.js, list `@pop-choice/ui` in `transpilePackages`.

## shadcn/ui Policy

Use shadcn/ui as the source-code baseline for common primitives, not as a black-box dependency.
The CLI copies component source into the repo, which fits PopChoice because we need operator-dense
backoffice variants and branded web variants.

When initializing shadcn in the monorepo:

- Prefer `packages/ui` as the install target for reusable primitives.
- Keep app `components.json` files aligned with the shared package aliases.
- Use Tailwind CSS v4 configuration style: leave `tailwind.config` empty in `components.json`.
- Use the same `style`, `iconLibrary`, and `baseColor` across app and shared configs.
- Prefer Radix-backed components unless there is a concrete reason to choose Base UI.

Current shadcn-derived primitives:

- `Button`, `ButtonLink`, `buttonVariants`
- `Badge`
- `TabsNav`, `TabsLink`
- `TableScroll`, `Table`, `DataTable`, `TableEmptyRow`

Next likely primitives:

- `tooltip`
- `field`, `input`, `textarea`, `select`, `checkbox`, `switch`
- `dialog` or `alert-dialog` for destructive/batch confirmations
- `dropdown-menu`, `popover`, `command`/`combobox` for operator search and filters
- `pagination`, `skeleton`, `empty`

Do not put domain components such as `CatalogHealthOverview`, `RepairBatchItemsTable`, or
`ManualMovieMetadataPanel` into `packages/ui` until they have a second real consumer.

## Backoffice UI Rules

- Backoffice is wired for Tailwind CSS v4 through `apps/backoffice/postcss.config.mjs` and
  `apps/backoffice/src/app/globals.css`.
- Prefer Tailwind utilities first; add custom CSS only for reusable layout primitives, complex
  table behavior, or app-level tokens.
- Existing global CSS can remain while screens are migrated incrementally; new components should
  prove why a custom selector is needed before adding one.
- Each backoffice screen should expose one next operator action before secondary diagnostics.
- Use neutral colors for counts, warning colors for work that needs attention, and green only for
  genuinely healthy or completed states.
- Keep diagnostics visually quieter than actions.
- Confirmation UI must be contained inside its panel or use a dialog; it must not depend on a narrow
  action-column width.
- Add stories or browser tests for long labels, unavailable data, open confirmations, and narrow
  viewports before merging UI workflow changes.
