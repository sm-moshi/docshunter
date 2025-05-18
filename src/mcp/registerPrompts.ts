import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrompts(mcp: McpServer) {
  mcp.prompt("onConnect", () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "You're connected to the Perplexity MCP server. Use tools or ask for memory.",
        },
      },
    ],
  }));
}