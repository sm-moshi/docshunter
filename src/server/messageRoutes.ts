import type { Express, Request, Response } from "express";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerMessageRoutes(app: Express, mcpServer: McpServer) {
  app.post("/messages", async (req: Request, res: Response) => {
    const transport = (mcpServer as any).transports?.[0];
    if (!transport) {
      return res.status(503).json({ error: "MCP server not connected via SSE." });
    }

    try {
      await transport.handlePostMessage(req, res);
    } catch (err) {
      res.status(500).json({ error: "Failed to handle message", detail: String(err) });
    }
  });
}