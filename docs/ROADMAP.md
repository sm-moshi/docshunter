# ROADMAP: Perplexity MCP Zerver (2025)

## Q2 2025
- Audit and expand automated test coverage for all modules and tool handlers
- Write/expand unit and integration tests (including error cases and orchestration)
- Set up code coverage reporting and enforce threshold in CI
- Implement robust, consistent error handling and structured logging (centralized logger, standardized messages)
- Begin config validation (schema, fail fast, centralize management)
- List and document all environment variables, add `.env.example`
- [x] Refactor all workflows in `.github/workflows/` for best practices (env blocks, pin actions, caching, error handling, matrix builds, permissions, secrets) (2025-05-20)
- [x] Add or update community health files in `.github/`: (2025-05-20)
  - [x] `CONTRIBUTING.md`, `CODEOWNERS`, `SECURITY.md`, `FUNDING.yml`, `ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE/` (2025-05-20)

## Q3 2025
- Harden Puppeteer/browser security and database file handling (sandboxing, updates, permissions)
- Handle database errors gracefully and avoid sensitive data leaks
- Run and address results from `pnpm audit` regularly
- Add/update security documentation in `SECURITY.md` or README
- Complete onboarding, troubleshooting, and usage documentation (add common pitfalls, usage examples, dev scripts, VS Code recommendations)
- Add README badges for build status, coverage, and version
- Document CI/CD setup and workflow in README
- Add or update community health files in `.github/`:
  - `CONTRIBUTING.md`, `CODEOWNERS`, `SECURITY.md`, `FUNDING.yml`, `ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE/`

## Q4 2025
- Research and prototype a plugin/extension system for tool handlers (dynamic registration, plugin API, extensibility tests)
- Define and document a versioning scheme for tool APIs
- Integrate full CI/CD pipeline (lint, test, coverage, release automation)
- Automate changelog and version bumping for releases
- Expand documentation for advanced features and integrations
- Gather user/developer feedback for next major version

---

> Review progress at the end of each quarter and update this roadmap as needed. Prioritize testing, error handling, and workflow/community health improvements before extensibility and CI/CD.
