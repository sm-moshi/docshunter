# Developer Onboarding: Perplexity MCP Zerver

Welcome! This guide will help you get started as a contributor to the Perplexity MCP Zerver project.

## 1. Prerequisites
- Node.js 20.x or later
- pnpm (install globally: `npm install -g pnpm`)
- VS Code or Cursor (recommended)
- Git

## 2. Setup
```sh
git clone https://github.com/sm-moshi/perplexity-mcp-zerver.git
cd perplexity-mcp-zerver
pnpm install
```

## 3. Build & Run
```sh
pnpm build
pnpm start
```

## 4. Development Workflow
- Use feature branches (`feature/*`) for new work
- Run `pnpm lint` and `pnpm test` before committing
- Use `pnpm format` to auto-format code
- Write and update tests for all new features
- Keep documentation up to date
- Prioritize testing, error handling, and config validation in all changes

## 5. Troubleshooting
- **Puppeteer errors:** Ensure all system dependencies for Chromium are installed
- **Database errors:** Check file permissions for `chat_history.db`
- **Type errors:** Run `pnpm check-types` to diagnose
- **Test failures:** Run `pnpm test:ui` for interactive debugging

## 6. Useful Commands
- `pnpm lint` – Lint code
- `pnpm test` – Run tests
- `pnpm test:coverage` – Run tests with coverage
- `pnpm format` – Format code
- `pnpm build` – Build project

## 7. Resources
- [README.md](./README.md)
- [TODO.md](./TODO.md)
- [ROADMAP.md](./ROADMAP.md)
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md)
- [memory-bank/](../memory-bank/)

---

For help, open an issue or ask in the project chat.
