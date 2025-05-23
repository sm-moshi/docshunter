# Docshunter <a href="https://raw.githubusercontent.com/sm-moshi/docshunter/main/README.md" title="Copy Full README Content (opens raw file view)">📋</a>

A research level Model Context Protocol (MCP) server implementation providing AI-powered research capabilities by interacting with the Perplexity website without requiring an API key.

## Features

- 🔍 Web search integration via Perplexity's web interface.
- 💬 Persistent chat history for conversational context.
- 📄 Tools for documentation retrieval, API finding, and code analysis.
- 🚫 No API Key required (relies on web interaction).
- 🛠️ TypeScript-first implementation.
- 🌐 Uses Puppeteer for browser automation.

## Tools

### 1. Search (`search`)

Performs a search query on Perplexity.ai. Supports `brief`, `normal`, or `detailed` responses. Returns raw text output.

### 2. Get Documentation (`get_documentation`)

Asks Perplexity to provide documentation and examples for a technology/library, optionally focusing on specific context. Returns raw text output.

### 3. Find APIs (`find_apis`)

Asks Perplexity to find and evaluate APIs based on requirements and context. Returns raw text output.

### 4. Check Deprecated Code (`check_deprecated_code`)

Asks Perplexity to analyze a code snippet for deprecated features within a specific technology context. Returns raw text output.

### 5. Extract URL Content (`extract_url_content`)

Extracts main article text content from URLs using browser automation and Mozilla's Readability. Handles GitHub repositories via gitingest.com. Supports recursive link exploration up to depth. Returns structured JSON with content and metadata.

### 6. Chat (`chat_perplexity`)

Maintains ongoing conversations with Perplexity AI. Stores chat history locally in `chat_history.db` within the project directory. Returns a *stringified JSON object* containing `chat_id` and `response`.

## Installation
>
> just copy <a href="https://raw.githubusercontent.com/sm-moshi/docshunter/main/README.md" title="Copy Full README Content (opens raw file view)">📋</a> and paste the readme and let the AI take care of the rest

1. Clone or download this repository:

```bash
git clone https://github.com/sm-moshi/docshunter.git
cd docshunter
```

2. Install dependencies:

```bash
pnpm install
```

3. Build the server:

```bash
pnpm run build
```

> **Important**: Ensure you have Node.js installed. Puppeteer will download a compatible browser version if needed during installation. Restart your IDE/Application after building and configuring the project for changes to take effect.

## Configuration

Add the server to your MCP configuration file (e.g., `cline_mcp_settings.json` for the VS Code extension or `claude_desktop_config.json` for the desktop app).

**Important:** Replace `/path/to/docshunter/build/index.js` with the **absolute path** to the built `index.js` file on your system.

Example for Cline/RooCode Extension:

```json
{
  "mcpServers": {
    "docshunter": {
      "command": "node",
      "args": [
        "/full/path/to/your/docshunter/build/index.js" // <-- Replace this path! (in case of windows for ex: "C:\\Users\\$USER\\Documents\\Cline\\MCP\\docshunter\\build\\index.js"
      ],
      "env": {},
      "disabled": false,
      "alwaysAllow": [],
      "autoApprove": [],
      "timeout": 300
    }
  }
}
```

Example for Claude Desktop:

```json
{
  "mcpServers": {
    "docshunter": {
      "command": "node",
      "args": [
        "/full/path/to/your/docshunter/build/index.js" // <-- Replace this path!
      ],
      "env": {},
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

## Usage

1. Ensure the server is configured correctly in your MCP settings file.
2. Restart your IDE (like VS Code with the Cline/RooCode extension) or the Claude Desktop application.
3. The MCP client should automatically connect to the server.
4. You can now ask the connected AI assistant (like Claude) to use the tools, e.g.:
    - "Use perplexity-server search to find the latest news on AI."
    - "Ask perplexity-server get_documentation about React hooks."
    - "Start a chat with perplexity-server about quantum computing."

## Credits

Thanks DaInfernalCoder:

- [DaInfernalCoder/perplexity-researcher-mcp](https://github.com/DaInfernalCoder/perplexity-researcher-mcp)

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE.md](LICENSE) file for details.

## Disclaimer

This project interacts with the Perplexity website via web automation (Puppeteer). It is intended for educational and research purposes only. Web scraping and automation may be against the terms of service of the target website. The author does not endorse or encourage any unauthorized automation or violation of terms of service. Use responsibly and ethically. The stability of this server depends on the Perplexity website's structure remaining consistent.

## 🧹 Technical Debt & Refactor Roadmap

This project is currently in **Phase 1** of a major refactor. The main server logic is still monolithic (`src/index.ts`), and modularization is in progress. Key improvements planned:

- Move server, database, puppeteer, and tool handler logic to dedicated modules.
- Add Zod schema validation for all tool handler inputs/outputs.
- Standardize error handling and logging.
- Centralize configuration.
- Prepare for plugin/dynamic tool registration.
- Refactor for unit/integration testability.
- Fix all linter issues.

For a detailed migration plan and current audit findings, see [`docs/refactor-guide-phase-1.md`](docs/refactor-guide-phase-1.md#-audit-findings-as-of-2025-05-xx).
