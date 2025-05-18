// src/tools/findApis.ts
import { ToolSchemas } from "../types/ToolSchemas";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTool(mcp: McpServer) {
  mcp.tool(
    "find_apis",
    "Extract API method calls or imports from code",
    ToolSchemas.find_apis,
    async ({ code }) => {
      return {
        content: [
          {
            type: "text",
            text: `Detected APIs from code snippet (placeholder):\n${code
              .split("\n")
              .filter((line) => line.includes(".") || line.includes("import"))
              .slice(0, 5)
              .join("\n")}`,
          },
        ],
      };
    }
  );
}