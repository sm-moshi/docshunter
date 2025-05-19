// src/tools/getDocumentation.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTool(mcp: McpServer) {
  mcp.tool(
    "get_documentation",
    "Look up documentation for a programming keyword or API",
    {
      topic: z.string(),
    },
    async ({ topic }) => {
      return {
        content: [
          {
            type: "text",
            text: `Looking up docs for: ${topic}... (mocked result)`,
          },
        ],
      };
    }
  );
}