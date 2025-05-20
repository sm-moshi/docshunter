# Troubleshooting Guide: Perplexity MCP Zerver

This guide covers common issues and solutions for developing and running the Perplexity MCP Zerver, based on the latest architecture and improvement plan.

## 1. Setup Issues
- **pnpm not found:** Install globally with `npm install -g pnpm`.
- **Node.js version mismatch:** Use Node.js 20.x or later. Check with `node -v`.

## 2. Build & Run Problems
- **Build fails:** Run `pnpm lint` and `pnpm check-types` to diagnose errors.
- **Cannot start server:** Ensure all dependencies are installed and built (`pnpm install && pnpm build`).

## 3. Puppeteer/Browser Issues
- **Chromium not found:** Puppeteer downloads Chromium on install. Re-run `pnpm install` if missing.
- **Browser launch errors:** Check system dependencies for Chromium (see Puppeteer docs).
- **Timeouts or navigation errors:** Increase timeouts in config or check network connection.

## 4. Database Issues
- **Permission denied:** Ensure write access to `chat_history.db`.
- **Corrupted DB:** Delete `chat_history.db` and restart (will lose chat history).

## 5. Testing & Linting
- **Test failures:** Run `pnpm test:ui` for interactive debugging.
- **Lint errors:** Run `pnpm format` to auto-fix style issues.

## 6. Configuration & Environment
- **Missing env vars:** Check `.env.example` and set required variables.
- **Config validation errors:** Ensure all config values match the expected schema (see docs).

## 7. Error Handling & Logging
- **Unclear errors:** Check logs for structured error messages. Ensure error handling is up to date.

## 8. General Tips
- Restart your IDE after major dependency or config changes.
- Check the [README.md](./README.md), [ONBOARDING.md](./ONBOARDING.md), and [TODO.md](./TODO.md) for more help.

---

If your issue persists, open an issue on GitHub or ask in the project chat.
