# Best Practices for Project Dependencies and MCP Integration

## Puppeteer

- Always use async/await for browser automation.
- Prefer launching with explicit options (e.g., `{ headless: true }` for CI, `{ headless: false }` for debugging).
- Use `page.waitForSelector` before interacting with elements to avoid race conditions.
- Clean up resources: always close pages and browsers after use.
- Use `Promise.all([page.waitForNavigation(), page.click()])` for navigation-triggering actions.
- For device emulation, use `KnownDevices` and `page.emulate()`.
- Avoid hardcoding selectors; prefer ARIA selectors or robust CSS selectors.
- Use request interception for advanced scraping or blocking resources.

## better-sqlite3

- Use prepared statements for all queries to prevent SQL injection and improve performance.
- Enable WAL mode (`db.pragma('journal_mode = WAL')`) for better concurrency.
- Always close the database connection on process exit.
- Use transactions (`db.transaction()`) for batch operations.
- Prefer named parameters for clarity in complex queries.
- Use `.all()`, `.get()`, `.run()` appropriately for SELECT, single row, and write operations.
- For large data exports, use `.iterate()` and streams.

## @mozilla/readability

- Use with `jsdom` in Node.js for DOM simulation.
- Clone the document before parsing to avoid mutating the original DOM.
- Use `isProbablyReaderable` to check if a page is suitable for parsing.
- Always check for null on `reader.parse()` result.

## axios

- Use async/await for all HTTP requests.
- Set a reasonable `timeout` for all requests.
- Use `try/catch` and check `error.response`, `error.request`, and `error.message` for robust error handling.
- Prefer creating an axios instance with defaults for baseURL, headers, and timeout.
- Use interceptors for logging, auth, or error handling.
- For file uploads, set `Content-Type: multipart/form-data`.
- Use `AbortController` for request cancellation.

## pnpm

- Use `pnpm install` for dependency management; it's faster and more space-efficient than npm/yarn.
- Specify the pnpm version in `package.json` (`"packageManager": "pnpm@x.y.z"`).
- Use `pnpm add` for adding dependencies, `pnpm remove` for removal.
- Use `pnpm licenses list` to audit package licenses.
- Use `pnpm dlx` for running one-off commands without global installs.
- Configure workspace settings in `pnpm-workspace.yaml`.

## Model Context Protocol (MCP) & AI Integration

- Use the official SDKs for server/client implementations.
- Register tools, resources, and prompts explicitly in the server.
- Use stdio or HTTP transports for local and remote integration.
- Always list and describe available tools for clients.
- Handle tool calls and responses asynchronously.
- Use memory advisors and chat history for context-aware AI.
- For Claude/Anthropic integration, pass available tools and handle tool-use events in the conversation loop.
- Use JSON schemas for tool input validation.
- Prefer modular, capability-driven server/client design.

---
_Last updated: Fri May 23 14:03:12 CEST 2025_
