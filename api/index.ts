import "dotenv/config";
import express from "express";
import { count } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { getDb } from "../server/db";
import { departments } from "../drizzle/schema";

const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

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

// Normalize tRPC incoming URLs
app.use((req, _res, next) => {
  if (req.url.startsWith("/trpc")) {
    req.url = `/api${req.url}`;
  }
  next();
});

// Mount tRPC at /api/trpc
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

export default function handler(req: any, res: any) {
  return app(req, res);
}
