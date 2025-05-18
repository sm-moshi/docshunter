// src/tools/chatPerplexity.ts
import { ToolSchemas } from "../types/ToolSchemas";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTool(mcp: McpServer) {
  mcp.tool(
    "chat_perplexity",
    "Start a new conversation with Perplexity",
    ToolSchemas.chat_perplexity,
    async ({ message }) => {
      return {
        content: [
          {
            type: "text",
            text: `This would trigger a full Perplexity chat simulation with: ${message}`,
          },
        ],
      };
    }
  );
}