# Maintainability Checklist

Use this checklist for lightweight, periodic maintainability reviews of PopChoice. Mark items as you verify them, and open focused follow-up issues for anything that stays unchecked.

## How to use

- Review this checklist during larger feature PRs, refactors, or monthly maintenance.
- Prefer small, scoped fixes instead of broad cleanup PRs.
- Link related docs (`README.md`, `docs/DEVELOPMENT.md`, `docs/CI-CD.md`, `docs/SERVICES.md`) when checking items.

## Checklist

### Architecture and boundaries

- [ ] Module boundaries are clear across `src/app`, `src/services`, `src/clients`, `src/lib`, and `src/utils`.
- [ ] API routes stay thin (validate input, call service, map response).
- [ ] Responsibilities between `src/services` and root `services/*` are documented and followed.

### Code organization

- [ ] Directory and naming conventions are consistent and match current usage.
- [ ] `src/utils` contains reusable helpers, not growing domain orchestration.
- [ ] Shared exports remain intentional and do not hide ownership.

### API and business logic

- [ ] Route inputs are validated consistently at the boundary.
- [ ] Recommendation orchestration is centralized and easy to locate.
- [ ] Business constants (thresholds/config) have a clear single source of truth.

### Testing

- [ ] Critical recommendation and API flows have stable automated coverage.
- [ ] Failure paths (external APIs, DB, queueing) are tested where practical.
- [ ] Test conventions stay consistent across the app and `services/*`.

### Documentation

- [ ] `README.md` and docs in `docs/` match the real folder structure.
- [ ] Service READMEs and main docs do not conflict.
- [ ] Operational steps are automated where possible, not only documented manually.

### Configuration and environment management

- [ ] Required environment variables are clearly documented and validated at startup.
- [ ] App and service configuration is typed and consistent.
- [ ] Local setup remains reproducible using documented scripts.

### Dependencies and package management

- [ ] Dependencies are actively maintained and periodically reviewed.
- [ ] Dependency duplication across root and `services/*` is intentional.
- [ ] Versioning/tooling strategy is consistent across packages.

### CI/CD and automation

- [ ] CI checks remain green and aligned with local scripts.
- [ ] Path filters and workflow triggers reflect current repository layout.
- [ ] Repetitive maintenance tasks are scripted and safe to rerun.

### Error handling, logging, and operability

- [ ] Error responses are consistent and safe for users.
- [ ] Logging is structured and useful for troubleshooting.
- [ ] External dependency failures have predictable behavior (timeouts/retries/fallbacks where appropriate).

### Security-related maintainability

- [ ] Security hardening tasks in `SECURITY.md` are tracked and regularly reviewed.
- [ ] Input validation, output sanitization, and request limits are applied consistently.
- [ ] Secret and credential handling remains centralized and documented.

### Contributor experience

- [ ] New contributors can run, test, and lint the project using documented commands.
- [ ] Expected patterns for adding routes/services/components are discoverable in docs.
- [ ] Small changes can be made without touching unrelated modules.

## PopChoice priority next steps (highest impact)

- [ ] Document and enforce boundaries for `app` / `services` / `lib` / `utils`.
- [ ] Keep API route handlers thin and centralize recommendation orchestration.
- [ ] Eliminate manual sync points for recommendation thresholds/config and docs.
- [ ] Align docs with current structure (for example naming drift like `db` vs `database`).
- [ ] Standardize conventions shared by root app and root-level `services/*` packages.
