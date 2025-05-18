// src/tools/checkDeprecatedCode.ts
import { ToolSchemas } from "../types/ToolSchemas";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTool(mcp: McpServer) {
  mcp.tool(
    "check_deprecated_code",
    "Check for deprecated code patterns in a code snippet",
    ToolSchemas.check_deprecated_code,
    async ({ code }) => {
      return {
        content: [
          {
            type: "text",
            text: `Scanning code for deprecated syntax:\n\n${code.slice(0, 100)}...`,
          },
        ],
      };
    }
  );
}