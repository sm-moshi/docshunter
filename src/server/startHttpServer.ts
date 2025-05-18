import type { Express } from "express";

export async function startHttpServer(app: Express, port = 7331) {
  return new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`MCP server listening on http://localhost:${port}`);
      resolve();
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`Port ${port} in use, trying 7332...`);
        startHttpServer(app, 7332).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}