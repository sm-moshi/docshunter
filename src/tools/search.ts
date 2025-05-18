// src/tools/search.ts
import { ToolSchemas } from "../types/ToolSchemas";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTool(mcp: McpServer) {
  mcp.tool(
    "search",
    "Perform a web search via Perplexity",
    ToolSchemas.search,
    async ({ query }) => {
      return {
        content: [
          {
            type: "text",
            text: `You searched for: ${query} (this tool will eventually return real Perplexity results)`,
          },
        ],
      };
    }
  );
}
