#!/usr/bin/env node

import { PerplexityMCPServer } from "./server/PerplexityMCPServer.js";

const server = new PerplexityMCPServer();

process.on("SIGINT", async () => {
  if (typeof server.close === "function") {
    await server.close();
  }
  process.exit(0);
});

server.run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
