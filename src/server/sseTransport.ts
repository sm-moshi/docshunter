import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { Express, Request, Response } from "express";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function setupSSE(app: Express, mcpServer: McpServer) {
  app.get("/sse", async (req: Request, res: Response) => {
    res.write(": connected\n\n");

    const transport = new SSEServerTransport("/messages", res);
    await mcpServer.connect(transport);

    const tools = mcpServer.listTools?.() || [];
    transport.sendMessage({
      type: "tools",
      tools: tools.map((t) => ({ name: t.name }))
    });

    req.on("close", () => {
      // Optional cleanup
    });
  });
}