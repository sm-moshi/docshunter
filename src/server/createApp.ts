import { PerplexityMCPServer } from "../index.js";

export function createApp() {
  const server = new PerplexityMCPServer();
  server.run().catch(console.error);
}
