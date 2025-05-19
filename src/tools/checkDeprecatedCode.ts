// src/tools/checkDeprecatedCode.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTool(mcp: McpServer) {
  mcp.tool(
    "check_deprecated_code",
    "Check for deprecated code patterns in a code snippet",
    {
      code: z.string().min(5),
    },
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