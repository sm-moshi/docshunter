// src/tools/findApis.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTool(mcp: McpServer) {
  mcp.tool(
    "find_apis",
    "Extract API method calls or imports from code",
    {
      code: z.string().min(5),
    },
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