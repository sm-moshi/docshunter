# TODO: Perplexity MCP Zerver Improvement Plan (2025)

This TODO is based on the latest audit and best practices for TypeScript, Node.js, Puppeteer, and MCP server development.

## 1. Testing & Coverage
- [ ] Expand automated tests for all tool handlers and core modules
- [ ] Add integration tests for tool orchestration and error cases
- [ ] Ensure high code coverage (target: >90%)

## 2. Error Handling & Logging
- [ ] Implement robust, consistent error handling for all async operations (browser, db, etc.)
- [ ] Add a centralized, structured logging utility (e.g., pino, winston)
- [ ] Standardize error messages and log formats

## 3. Configuration & Environment
- [ ] Add config validation using a schema validator (e.g., zod, joi)
- [ ] Document all required/optional environment variables in README and provide `.env.example`

## 4. Security & Resource Management
- [ ] Harden Puppeteer/browser usage (sandboxing, regular updates, no data leaks)
- [ ] Review and secure database file permissions and error handling

## 5. Developer Experience
- [ ] Expand onboarding documentation (step-by-step setup, workflow, troubleshooting)
- [ ] Add more real-world usage examples for each tool in README and docs

## 6. Extensibility
- [ ] Consider implementing a plugin/extension system for tool handlers
- [ ] Plan for API versioning if breaking changes are expected

## 7. CI/CD Integration
- [ ] Integrate with GitHub Actions (or similar) for lint, test, and coverage on PRs
- [ ] Automate changelog generation and version bumping for releases

---

> Work through these sections in order. Testing comes first to enable safe improvements. Commit after each successful step. Regularly review and update this TODO as progress is made.
