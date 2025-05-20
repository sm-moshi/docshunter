# TODO: Perplexity MCP Zerver Improvement Plan (2025)

This TODO is based on the latest audit, best practices for TypeScript/Node.js/Puppeteer/MCP, and GitHub workflows/community health recommendations.

## 1. Testing & Coverage
- [ ] Audit existing tests for all tool handlers and core modules
- [ ] List files lacking unit or integration tests
- [ ] Write/expand unit tests for all tool handlers (main code paths, edge/error cases)
- [ ] Write/expand unit tests for core modules (browser, db, config)
- [ ] Add integration tests for tool orchestration (end-to-end chat, search, extraction)
- [ ] Test error propagation and recovery
- [ ] Set up code coverage reporting with Vitest (v8+lcov)
- [ ] Add a coverage badge to README
- [ ] Enforce coverage threshold in CI (fail if <90%)
- [ ] Document test strategy in README or TESTING.md

## 2. Error Handling & Logging
- [ ] Audit all async operations (browser, db, network, etc.)
- [ ] Standardize error handling (try/catch, meaningful messages)
- [ ] Add a centralized logging utility (e.g., pino, winston)
- [ ] Replace all console.log/error with structured logging
- [ ] Use log levels (info, warn, error, debug)
- [ ] Standardize error message formats (e.g., { code, message, details })
- [ ] Document error codes/messages in developer docs
- [ ] Ensure CI logs all errors and warnings

## 3. Configuration & Environment
- [ ] Add config validation using a schema validator (zod, joi)
- [ ] Fail fast with clear error messages if config is invalid
- [ ] List all required/optional env vars in README
- [ ] Add a `.env.example` file with comments
- [ ] Centralize config management in a single module
- [ ] Add tests for config loading/validation and missing/invalid env vars

## 4. Security & Resource Management
- [ ] Always use Puppeteer sandbox mode unless explicitly disabled for CI
- [ ] Regularly update Puppeteer and Chromium
- [ ] Avoid leaking sensitive data in logs or browser context
- [ ] Ensure `chat_history.db` is not world-readable/writable
- [ ] Handle database errors gracefully (file locks, corruption)
- [ ] Run `pnpm audit` regularly and address all high/critical vulnerabilities
- [ ] Add/update security documentation in SECURITY.md or README

## 5. Developer Experience
- [ ] Expand onboarding docs (step-by-step setup, workflow, troubleshooting)
- [ ] Add common pitfalls and resolutions
- [ ] Add at least one real-world usage example for each tool in USAGE_EXAMPLES.md and README
- [ ] Add/expand local dev scripts (e.g., `pnpm dev`, `pnpm test:watch`)
- [ ] List recommended VS Code extensions and settings
- [ ] Add a section for developer feedback in README or CONTRIBUTING.md

## 6. Extensibility
- [ ] Research plugin/extension patterns for tool handlers
- [ ] Prototype a plugin system (dynamic handler registration)
- [ ] Document the plugin API and how to add new tools
- [ ] Define and document a versioning scheme for tool APIs
- [ ] Add extensibility tests (adding/removing plugins, version compatibility)

## 7. CI/CD & GitHub Workflows
- [x] Refactor all workflows in `.github/workflows/` for best practices: (2025-05-20)
  - [x] Use `env:` blocks for shared environment variables (2025-05-20)
  - [x] Pin all action versions (avoid `@main`/`@master`) (2025-05-20)
  - [x] Add caching for dependencies using `actions/cache` and `hashFiles` (2025-05-20)
  - [x] Use `continue-on-error` and `steps.<id>.outcome` for robust error handling (2025-05-20)
  - [x] Add problem matchers for better error reporting (2025-05-20)
  - [x] Use matrix builds for multi-version/multi-platform testing (2025-05-20)
  - [x] Limit permissions and use secrets for sensitive data (2025-05-20)
  - [x] Use composite actions for repeated logic (2025-05-20)
- [x] Add README badges for build status, coverage, and version (2025-05-20)
- [x] Document CI/CD setup and workflow in README (2025-05-20)

## 8. Community Health Files (.github/)
- [x] Add or update the following in `.github/`: (2025-05-20)
  - [x] `CONTRIBUTING.md` (contribution process, code style, PR review) (2025-05-20)
  - [x] `CODEOWNERS` (define code owners for review/approval) (2025-05-20)
  - [x] `SECURITY.md` (security policy and vulnerability reporting) (2025-05-20)
  - [x] `FUNDING.yml` (if accepting donations) (2025-05-20)
  - [x] `ISSUE_TEMPLATE/` and `PULL_REQUEST_TEMPLATE/` (standardize issues and PRs) (2025-05-20)

---

> Work through these sections in order. Testing comes first to enable safe improvements. Commit after each successful step. Regularly review and update this TODO as progress is made.
