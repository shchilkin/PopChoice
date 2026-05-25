---
title: 'Documentation Governance'
description: 'Rules for keeping PopChoice documentation accurate, tracked, and useful as the project changes.'
---

# Documentation Governance

Track this work through the documentation source-of-truth epic
[#515](https://github.com/shchilkin/PopChoice/issues/515) and issue
[#519](https://github.com/shchilkin/PopChoice/issues/519).

## Source of truth

- `docs/` is the canonical home for long-form project documentation.
- `README.md` is the concise entry point: keep quick start, project summary, and high-value links there, then send deeper details to `docs/`.
- Service-local READMEs explain how to run and operate that specific service. The docs site explains cross-service architecture, deployment, environment, and operational workflows.
- `AGENTS.md` gives repo-specific instructions for agents. When those instructions become useful to humans too, mirror the durable rule into `docs/`.

## Page rules

- Every Fumadocs page must include frontmatter with at least `title` and, for new pages, `description`.
- Add new top-level docs pages to `docs/meta.json` in the section where readers will expect them.
- Use site links for docs-to-docs references, for example `/docs/DEVELOPMENT`, `/docs/API-REFERENCE`, and `/docs/ENVIRONMENT`.
- Prefer short, actionable sections with checklists, tables, and commands over narrative-only notes.
- Keep generated output, secret values, screenshots that age quickly, and one-off debugging transcripts out of canonical docs unless they become a reusable runbook.

## When code changes require docs

Update docs in the same PR when a change affects:

- local setup, scripts, package commands, or developer workflow: update `/docs/DEVELOPMENT` and, when broad enough, `README.md`;
- environment variables, secrets, build metadata, or deployment-only configuration: update `/docs/ENVIRONMENT`;
- public or operational API contracts: update `/docs/API-REFERENCE`;
- CI, checks, release flow, image publishing, or deployment gates: update `/docs/CI-CD`;
- module ownership, workspace boundaries, or service responsibilities: update the relevant architecture docs and `/docs/ROADMAP-ARCHITECTURE`;
- service behavior, queues, workers, seed/discovery/backfill flows, or operator runbooks: update the relevant service README and the matching docs-site page.

If a code PR deliberately skips a needed docs update, call that out in the PR and create a follow-up issue.

## Roadmap and issue hygiene

- Create a GitHub issue for every actionable new documentation or roadmap task before or alongside adding it to docs.
- If the work is too large for one PR, keep the original issue as an epic or umbrella and split focused child issues.
- Roadmap entries should link to concrete issues whenever possible.
- Keep unlinked roadmap bullets for direction-setting only; convert them into issues once they become actionable.
- Close completed docs issues only after the docs page is merged or the issue has a clear comment explaining why it is no longer needed.

## Avoid duplication and drift

- Do not copy full sections between README, docs pages, and service READMEs. Link to the canonical page instead.
- If two pages need the same fact, pick an owner page and make the other page a short pointer.
- When renaming scripts, routes, env vars, services, or directories, search the docs and update all references in the same PR.
- Prefer current behavior over plans in reference pages. Put future intent in roadmap pages or issues.
- Remove stale notes when replacing a workflow; do not leave both old and new instructions unless both are supported.

## CI and verification

- Docs-only PRs should pass formatting/diff hygiene and the docs build.
- For docs-site changes, run:

```bash
npm run type-check:docs
npm run build:docs
```

- For Markdown-only edits, at minimum run:

```bash
git diff --check -- docs
```

- If the docs change affects examples, commands, API contracts, environment variables, or deployment steps, verify the referenced source file or script still matches the text.

## Agent checklist

- [ ] Read the owning source before editing docs: code, scripts, workflow files, service README, or existing docs.
- [ ] Keep edits scoped to the affected docs page unless navigation, README links, or roadmap status must also change.
- [ ] Add or update issue links for new actionable work.
- [ ] Use site paths for internal docs links.
- [ ] Update `docs/meta.json` when adding a navigable page.
- [ ] Run the smallest meaningful docs check and report any check that could not run.
