#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const ROOT = path.resolve(__dirname, "..");

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function parsePort(argv) {
  const defaultPort = 4173;
  const portArg = argv.find((arg) => arg.startsWith("--port="));
  if (portArg) {
    const parsed = Number(portArg.split("=")[1]);
    if (Number.isInteger(parsed) && parsed > 0 && parsed < 65536) {
      return parsed;
    }
  }

  const index = argv.indexOf("--port");
  if (index !== -1 && argv[index + 1]) {
    const parsed = Number(argv[index + 1]);
    if (Number.isInteger(parsed) && parsed > 0 && parsed < 65536) {
      return parsed;
    }
  }

  const envPort = Number(process.env.PORT);
  if (Number.isInteger(envPort) && envPort > 0 && envPort < 65536) {
    return envPort;
  }

  return defaultPort;
}

function isHelp(argv) {
  return argv.includes("--help") || argv.includes("-h");
}

function printHelp() {
  console.log("GitDNA local dev server");
  console.log("");
  console.log("Usage:");
  console.log("  npm run dev");
  console.log("  node scripts/dev_server.js --port 4173");
}

function safePathFromUrl(requestUrl) {
  const parsed = new URL(requestUrl, "http://localhost");
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === "/") {
    pathname = "/index.html";
  }

  const absolute = path.normalize(path.join(ROOT, pathname));
  if (!absolute.startsWith(ROOT)) {
    return null;
  }
  return absolute;
}

function resolveFilePath(absolutePath) {
  if (!absolutePath) {
    return null;
  }

  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
    return absolutePath;
  }

  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
    const indexFile = path.join(absolutePath, "index.html");
    if (fs.existsSync(indexFile)) {
      return indexFile;
    }
  }

  return null;
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, { "Content-Type": mime });
  stream.pipe(res);
}

function createServer() {
  return http.createServer((req, res) => {
    const safePath = safePathFromUrl(req.url || "/");
    const filePath = resolveFilePath(safePath);
    if (filePath) {
      serveFile(filePath, res);
      return;
    }

    const fallback = path.join(ROOT, "index.html");
    if (fs.existsSync(fallback)) {
      serveFile(fallback, res);
      return;
    }

    send(res, 404, "Not found");
  });
}

function main() {
  const argv = process.argv.slice(2);
  if (isHelp(argv)) {
    printHelp();
    return;
  }

  const port = parsePort(argv);
  const server = createServer();
  server.listen(port, () => {
    console.log(`GitDNA dev server running at http://localhost:${port}`);
  });
}

main();
