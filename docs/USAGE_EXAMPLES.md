# Usage Examples: Perplexity MCP Zerver

This guide provides real-world usage examples for each tool and common workflows, based on the current architecture and improvement plan.

## 1. Search Tool
**Find the latest news on AI:**
```
Use perplexity-server search to find the latest news on AI.
```

## 2. Get Documentation
**Get React hooks documentation:**
```
Ask perplexity-server get_documentation about React hooks.
```

## 3. Find APIs
**Find APIs for weather data:**
```
Ask perplexity-server find_apis for weather data APIs.
```

## 4. Check Deprecated Code
**Check if a code snippet uses deprecated features:**
```
Ask perplexity-server check_deprecated_code for this code in Node.js: <paste code here>
```

## 5. Extract URL Content
**Extract main content from a web page:**
```
Ask perplexity-server extract_url_content for https://example.com/article
```

## 6. Chat with Perplexity
**Start a chat about quantum computing:**
```
Start a chat with perplexity-server about quantum computing.
```

## 7. Common Workflows
- **Add a new tool handler:**
  1. Create a new file in `src/server/toolHandlers/`.
  2. Export a named handler function.
  3. Register the handler in `PerplexityMCPServer.ts`.
  4. Add tests in `toolHandlers/*.test.ts`.
  5. Ensure robust error handling and add integration tests.

- **Run all tests and check coverage:**
  ```sh
  pnpm test:coverage
  ```

- **Format codebase:**
  ```sh
  pnpm format
  ```

- **Check config and environment:**
  - Review `.env.example` and ensure all required variables are set.
  - Run config validation at startup.

---

For more details, see the [README.md](./README.md), [ONBOARDING.md](./ONBOARDING.md), and [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
