import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserManager } from "./browser.js";
import { ChatDatabase } from "./database.js";
import { TOOL_DEFINITIONS } from "./toolDefinitions.js";
import { handleChatPerplexity } from "./toolHandlers/chat.js";
import { handleCheckDeprecatedCode } from "./toolHandlers/checkDeprecatedCode.js";
import { handleExtractUrlContent } from "./toolHandlers/extractUrlContent.js";
import { handleFindApis } from "./toolHandlers/findApis.js";
import { handleGetDocumentation } from "./toolHandlers/getDocumentation.js";
import { handleSearch } from "./toolHandlers/search.js";

export class PerplexityMCPServer {
  private db: ChatDatabase;
  private browserManager: BrowserManager;
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: "perplexity-mcp", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );
    const dbBaseDir = join(dirname(fileURLToPath(import.meta.url)), "..");
    this.db = new ChatDatabase(dbBaseDir);
    this.browserManager = new BrowserManager();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOL_DEFINITIONS,
    }));

    // The 'any' type is used here due to the dynamic nature of MCP tool requests
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: any) => {
        const toolName = request.params.name;
        try {
          let result: string;
          switch (toolName) {
            case "chat_perplexity":
              result = await handleChatPerplexity(
                request.params.arguments,
                this.db,
                this.browserManager,
                this.performSearch.bind(this),
              );
              break;
            case "search":
              result = await handleSearch(request.params.arguments, (query) =>
                this.performSearch(query),
              );
              break;
            case "extract_url_content":
              result = await handleExtractUrlContent(
                request.params.arguments,
                this.browserManager,
              );
              break;
            case "find_apis":
              result = await handleFindApis(request.params.arguments, (query) =>
                this.performSearch(query),
              );
              break;
            case "get_documentation":
              result = await handleGetDocumentation(
                request.params.arguments,
                (query) => this.performSearch(query),
              );
              break;
            case "check_deprecated_code":
              result = await handleCheckDeprecatedCode(
                request.params.arguments,
                (query) => this.performSearch(query),
              );
              break;
            default:
              throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${toolName}`,
              );
          }
          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `The operation encountered an error: ${error instanceof Error ? error.message : String(error)}. Please try again.`,
              },
            ],
          };
        }
      },
    );
  }

  private async performSearch(query: string): Promise<string> {
    try {
      // Ensure browser is initialized
      if (!this.browserManager || this.browserManager.isClosed()) {
        await this.browserManager.initializeBrowser();
      }

      // Navigate to Perplexity
      await this.browserManager.navigateToPerplexity();

      // Find the search input
      const selector = await this.browserManager.waitForSearchInput();
      if (!selector) {
        throw new Error("Search input not found");
      }

      // Clear and type the query
      await this.browserManager.evaluate((sel: string) => {
        const input = document.querySelector(sel)!;
        if (input) input.value = "";
      }, selector);
      await this.browserManager.click(selector, { clickCount: 3 });
      await this.browserManager.keyboard.press("Backspace");
      await this.browserManager.type(selector, query, { delay: 30 });
      await this.browserManager.keyboard.press("Enter");

      // Wait for response
      const proseSelector = ".prose";
      await this.browserManager.waitForSelector(proseSelector, {
        timeout: 90000,
        visible: true,
      });

      // Extract the answer
      const answer = (await this.browserManager.evaluate(() => {
        const elements = Array.from(document.querySelectorAll(".prose"));
        return elements
          .map((el) => (el as HTMLElement).innerText.trim())
          .join("\n\n");
      }));
      return typeof answer === "string" ? answer : "";
    } catch (error) {
      return `Search failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async run() {
    await this.browserManager.initializeBrowser();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Perplexity MCP server running");
  }

  public async close() {
    try {
      if (this.browserManager) {
        await this.browserManager.close();
      }
      if (this.db) {
        this.db.close();
      }
      if (this.server) {
        await this.server.close();
      }
      console.error("Perplexity MCP server shut down gracefully");
    } catch (err: unknown) {
      console.error(
        "Error during shutdown:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
