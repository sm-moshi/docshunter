import express from "express";
import { registerHealthRoutes } from "./healthRoutes";
import { registerMessageRoutes } from "./messageRoutes";
import { setupSSE } from "./sseTransport";
import { createMcpServer } from "../mcp/server";

export async function createApp() {
  const app = express();
  const mcpServer = createMcpServer();

  // Register routes
  registerHealthRoutes(app, mcpServer);
  setupSSE(app, mcpServer);
  registerMessageRoutes(app, mcpServer);

  return app;
}