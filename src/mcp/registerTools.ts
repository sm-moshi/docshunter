import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerTools(mcp: McpServer) {
  mcp.tool("ping", "Basic ping tool", {}, async () => ({
    content: [{ type: "text", text: "pong" }]
  }));

  mcp.tool("echo", "Echo text", {
    message: z.string(),
  }, async ({ message }) => ({
    content: [{ type: "text", text: `Echo: ${message}` }]
  }));
}