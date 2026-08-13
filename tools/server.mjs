import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";
import { networkInterfaces } from "node:os";

const root = normalize(join(import.meta.dirname, ".."));
const port = Number(process.env.PORT || process.argv[2] || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    let file = normalize(join(root, relative));
    if (!file.startsWith(root)) throw new Error("Invalid path");
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    } catch {
      file = join(root, "index.html");
    }
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`\nZenith is running:`);
  console.log(`  This computer: http://localhost:${port}`);
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === "IPv4" && !address.internal) console.log(`  Android/LAN:   http://${address.address}:${port}`);
    }
  }
  console.log("\nKeep this window open. Press Ctrl+C to stop.\n");
});
