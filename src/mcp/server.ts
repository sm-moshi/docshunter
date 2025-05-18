import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./registerTools";
import { registerPrompts } from "./registerPrompts";

export function createMcpServer() {
  const mcp = new McpServer({ name: "Perplexity MCP", version: "1.0.0" }, {
    capabilities: { tools: {}, logging: {} }
  });

  registerTools(mcp);
  registerPrompts(mcp);

  return mcp;
}