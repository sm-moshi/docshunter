// src/tools/getDocumentation.ts
import { ToolSchemas } from "../types/ToolSchemas";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTool(mcp: McpServer) {
  mcp.tool(
    "get_documentation",
    "Look up documentation for a programming keyword or API",
    ToolSchemas.get_documentation,
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
