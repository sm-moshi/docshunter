// src/tools/search.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTool(mcp: McpServer) {
  mcp.tool(
    "search",
    "Perform a web search via Perplexity",
    {
      query: z.string().min(2),
    },
    async ({ query }) => {
      // Placeholder logic, real one uses puppeteerClient + Perplexity scraping
      return {
        content: [{ type: "text", text: `You searched for: ${query}` }],
      };
    }
  );
}