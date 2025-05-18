import type { Express } from "express";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerHealthRoutes(app: Express, mcpServer: McpServer) {
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok ok" });
  });

  app.get("/status", (req, res) => {
    res.json({
      server: !!mcpServer,
      tools: mcpServer.listTools?.().map(t => t.name) ?? [],
    });
  });
}