import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { count } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getDb } from "../db";
import { departments } from "../../drizzle/schema";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";

  console.log("==========================================");
  console.log("🚀 CityCare Municipal Civic Platform Booting...");
  console.log(`- Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`- DATABASE_URL configured: ${Boolean(process.env.DATABASE_URL || ENV.databaseUrl) ? "yes" : "no"}`);

  try {
    const db = await getDb();
    if (db) {
      const deptCount = await db.select({ value: count() }).from(departments);
      console.log(`- DB connection: success (${deptCount[0]?.value ?? 0} municipal departments loaded)`);
    } else {
      console.log("- DB connection: unavailable");
    }
  } catch (error) {
    console.warn(`- DB connection test warning:`, (error as Error).message);
  }
  console.log("==========================================");

  const app = express();
  const server = createServer(app);

  // Body parsers
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Real Health Check endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(503).json({
          status: "degraded",
          server: true,
          database: false,
        });
      }
      await db.select({ value: count() }).from(departments);
      return res.status(200).json({
        status: "ok",
        server: true,
        database: true,
      });
    } catch {
      return res.status(503).json({
        status: "degraded",
        server: true,
        database: false,
      });
    }
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Normalize tRPC URLs
  app.use((req, _res, next) => {
    if (req.url.startsWith("/trpc")) {
      req.url = `/api${req.url}`;
    }
    next();
  });

  // tRPC API middleware
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path }) {
        console.error(`[tRPC Error on ${path}]:`, error);
      },
    })
  );

  // Frontend delivery (Vite in dev, static in prod)
  if (!isProduction) {
    console.log("[Server] Setting up Vite dev middleware...");
    await setupVite(app, server);
    console.log("[Server] Vite dev middleware ready.");
  } else {
    serveStatic(app);
  }

  // Exact port binding in production
  if (isProduction) {
    const port = Number(process.env.PORT || 3000);
    server.listen(port, "0.0.0.0", () => {
      console.log(`CityCare server listening on port ${port} (0.0.0.0)`);
    });
  } else {
    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);
    server.listen(port, "0.0.0.0", () => {
      console.log(`CityCare development server running on http://localhost:${port}/`);
    });
  }
}

startServer().catch(console.error);
