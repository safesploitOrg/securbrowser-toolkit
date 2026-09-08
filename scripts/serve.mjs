import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = resolve(SCRIPT_DIR, "../public");
const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const PORT = portIndex >= 0 ? Number(args[portIndex + 1]) : 8080;
const HOST = "127.0.0.1";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function securityHeaders() {
  return {
    "Cache-Control": "no-store",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  };
}

function resolveRequestPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const safeRelative = normalize(relative).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolute = resolve(join(PUBLIC_DIR, safeRelative));

  if (!absolute.startsWith(`${PUBLIC_DIR}/`) && absolute !== join(PUBLIC_DIR, "index.html")) {
    return null;
  }

  return absolute;
}

const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url || "/");

  if (!filePath) {
    response.writeHead(403, securityHeaders());
    response.end("Forbidden");
    return;
  }

  try {
    if (!statSync(filePath).isFile()) {
      throw new Error("Not a file");
    }

    response.writeHead(200, {
      ...securityHeaders(),
      "Content-Type": MIME_TYPES[extname(filePath)] || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, securityHeaders());
    response.end("Not found");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`SecurBrowser Toolkit: http://${HOST}:${PORT}`);
});
