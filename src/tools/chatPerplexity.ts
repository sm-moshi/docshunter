// src/tools/chatPerplexity.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTool(mcp: McpServer) {
  mcp.tool(
    "chat_perplexity",
    "Start a new conversation with Perplexity",
    {
      message: z.string().min(2),
    },
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