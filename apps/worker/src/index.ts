import http from "node:http";
import { setInterval } from "node:timers";
import { pino } from "pino";
import { runGmailPoll } from "./jobs/gmail-poll";

const logger = pino({
  name: "worker",
  level: process.env.LOG_LEVEL ?? "info",
});

const port = Number.parseInt(process.env.PORT ?? "4000", 10);

const server = http.createServer((req, res) => {
  if (!req.url || !req.method) {
    res.writeHead(400);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    const payload = JSON.stringify({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });

    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-length": Buffer.byteLength(payload),
    });
    res.end(payload);
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(port, () => {
  logger.info({ port }, "worker ready");

  const pollInterval = Number(process.env.GMAIL_POLL_INTERVAL_MS ?? 120000);
  setInterval(() => {
    runGmailPoll(logger);
  }, pollInterval).unref();
});

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, "shutting down");
  server.close((err) => {
    if (err) {
      logger.error({ err }, "error closing server");
      process.exitCode = 1;
    }
    process.exit();
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
