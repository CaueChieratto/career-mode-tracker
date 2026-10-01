import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { seed } from "./seed.mjs";
await seed();
const handler = (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:4179");
  const mode = req.headers.host.endsWith(":4180") ? "profile" : "navigation";
  const dir = resolve(".test-tools/performance", mode);
  const pathname = decodeURIComponent(
    url.pathname.replace(/^\/profile(?=\/)/, ""),
  );
  let file = resolve(dir, "." + pathname);
  if (file !== dir && !file.startsWith(dir + sep)) {
    res.writeHead(400);
    return res.end();
  }
  if (!extname(file) || !existsSync(file)) file = resolve(dir, "index.html");
  const mime =
    {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".jpeg": "image/jpeg",
      ".jpg": "image/jpeg",
      ".webp": "image/webp",
    }[extname(file)] || "application/octet-stream";
  let body = readFileSync(file);

  res.writeHead(200, {
    "Content-Type": mime,
    "Content-Length": body.length,
    "Cache-Control":
      extname(file) === ".html" ? "no-cache" : "public, max-age=3600",
    "Content-Security-Policy":
      "default-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:8089 http://127.0.0.1:9098; form-action 'self'; object-src 'none'",
  });
  res.end(body);
};
const server = createServer(handler),
  profilerServer = createServer(handler);
await new Promise((r) => profilerServer.listen(4180, "127.0.0.1", r));
await new Promise((r) => server.listen(4179, "127.0.0.1", r));
console.log("PERFORMANCE_READY http://127.0.0.1:4179");
if (process.env.PERF_HOLD !== "1") {
  let exitCode = 0;
  try {
    await import(process.env.PERF_TARGET || "./run-all.mjs");
  } catch (err) {
    console.error(err);
    exitCode = 1;
  } finally {
    server.close();
    profilerServer.close();
    process.exit(exitCode);
  }
}
