// src/mcp/registerTools.ts
import path from "path";
import fs from "fs/promises";
import { fileURLToPath, pathToFileURL } from "url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const toolsDir = path.join(__dirname, "../tools");

export async function registerTools(mcp: McpServer) {
  const files = await fs.readdir(toolsDir);

  for (const file of files) {
    if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;

    const fullPath = path.join(toolsDir, file);
    const moduleUrl = pathToFileURL(fullPath).href;

    try {
      const mod = await import(moduleUrl);

      if (typeof mod.registerTool === "function") {
        mod.registerTool(mcp);
        console.log(`[MCP] Registered tool from ${file}`);
      } else {
        console.warn(`[MCP] Skipped ${file}: no export named 'registerTool'`);
      }
    } catch (err) {
      console.error(`[MCP] Failed to load ${file}:`, err);
    }
  }
}