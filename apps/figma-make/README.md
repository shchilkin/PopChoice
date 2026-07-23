# PopChoice Figma Make prototype

This app preserves the original PopChoice UI prototype as an independently
runnable workspace inside the PopChoice monorepo. It is a historical design
reference, not the current production web application.

## Provenance

- Original repository: <https://github.com/shchilkin/popchoice-ui>
- Imported branch: `development`
- Imported commit: `5b525526909d0ece0f56fd042aba0ec77753927c`
- Import date: 2026-07-23
- Original Figma file:
  <https://www.figma.com/design/Q0EmaI0fFokpynQgwMPG6T/Design-PopChoice-UI>

The source files and `ATTRIBUTIONS.md` were imported without redesigning the
prototype. Monorepo package metadata and deployment files are maintained here.

## Local development

Run commands from the monorepo root:

```bash
npm install
npm run dev:figma-make
```

Build the static bundle with:

```bash
npm run build:figma-make
```

## Deployment contract

GitHub Actions builds
`ghcr.io/shchilkin/popchoice/figma-make:<tag>` from
`apps/figma-make/Dockerfile`. Coolify must consume that prebuilt image as a
standalone Docker Image application.

- Development review:
  <https://figma-make.dev.pop-choice.shchilkin.dev>
- Do not add this prototype to `coolify.compose.yml`.
- Do not configure a Nixpacks or Dockerfile source build in Coolify.
- Do not build the repository on the production VPS.
- The container serves the static app on port `80` and exposes `/healthz`.
- Keep the Coolify resource pinned to a reviewed SHA tag. The shared Compose
  deploy webhook does not update this standalone application.
