// src/tools/extractUrlContent.ts
import { ToolSchemas } from "../types/ToolSchemas";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTool(mcp: McpServer) {
  mcp.tool(
    "extract_url_content",
    "Extracts visible content from a given URL",
    ToolSchemas.extract_url_content,
    async ({ url }) => {
      return {
        content: [
          {
            type: "text",
            text: `Extracted main content from: ${url} (real Puppeteer logic coming soon)`,
          },
        ],
      };
    }
  );
}
