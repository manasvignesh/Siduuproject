// api/index.ts
import "dotenv/config";
import express from "express";
import { count as count2 } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/oauth.ts
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (_req, res) => {
    res.redirect(302, "/login");
  });
}

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID || "citycare",
  cookieSecret: process.env.JWT_SECRET || "citycare_super_secret_jwt_key_2026",
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:manasvig%40123@db.urfvhizrdtqfsifqvokz.supabase.co:5432/postgres",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL || "",
  ownerOpenId: process.env.OWNER_OPEN_ID || "admin-01",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL || "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY || ""
};

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z4 } from "zod";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const isSecure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: isSecure ? "none" : "lax",
    secure: isSecure
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// drizzle/schema.ts
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";
var userRoleEnum = pgEnum("user_role", ["user", "admin"]);
var issueStatusEnum = pgEnum("issue_status", [
  "submitted",
  "acknowledged",
  "in_progress",
  "resolved",
  "rejected",
  "reopened",
  "closed"
]);
var issuePriorityEnum = pgEnum("issue_priority", [
  "low",
  "medium",
  "high",
  "urgent"
]);
var photoKindEnum = pgEnum("photo_kind", ["before", "after"]);
var citizenVerificationEnum = pgEnum("citizen_verification", [
  "pending",
  "accepted",
  "rejected"
]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  passwordHash: text("passwordHash"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var issues = pgTable(
  "issues",
  {
    id: serial("id").primaryKey(),
    referenceCode: varchar("referenceCode", { length: 32 }).notNull().unique(),
    reporterId: integer("reporterId").references(() => users.id),
    isAnonymous: boolean("isAnonymous").default(false).notNull(),
    categorySlug: varchar("categorySlug", { length: 60 }).notNull(),
    departmentId: integer("departmentId").references(() => departments.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    status: issueStatusEnum("status").default("submitted").notNull(),
    priority: issuePriorityEnum("priority").default("medium").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    address: text("address"),
    upvoteCount: integer("upvoteCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    resolvedAt: timestamp("resolvedAt"),
    slaDeadline: timestamp("slaDeadline"),
    closedAt: timestamp("closedAt"),
    citizenVerification: citizenVerificationEnum("citizenVerification").default("pending").notNull(),
    verificationNote: text("verificationNote")
  },
  (table) => [
    index("issues_geo_idx").on(table.latitude, table.longitude),
    index("issues_status_idx").on(table.status),
    index("issues_category_idx").on(table.categorySlug)
  ]
);
var issuePhotos = pgTable("issue_photos", {
  id: serial("id").primaryKey(),
  issueId: integer("issueId").notNull().references(() => issues.id),
  url: text("url").notNull(),
  kind: photoKindEnum("kind").default("before").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var issueStatusHistory = pgTable("issue_status_history", {
  id: serial("id").primaryKey(),
  issueId: integer("issueId").notNull().references(() => issues.id),
  fromStatus: varchar("fromStatus", { length: 40 }),
  toStatus: varchar("toStatus", { length: 40 }).notNull(),
  changedById: integer("changedById").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var issueUpvotes = pgTable(
  "issue_upvotes",
  {
    id: serial("id").primaryKey(),
    issueId: integer("issueId").notNull().references(() => issues.id),
    userId: integer("userId").notNull().references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("issue_user_unique").on(table.issueId, table.userId)
  ]
);
var issueComments = pgTable("issue_comments", {
  id: serial("id").primaryKey(),
  issueId: integer("issueId").notNull().references(() => issues.id),
  authorId: integer("authorId").notNull().references(() => users.id),
  body: text("body").notNull(),
  isInternal: boolean("isInternal").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  issueId: integer("issueId").references(() => issues.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/db.ts
var _db = null;
var _client = null;
async function getDb() {
  const dbUrl = ENV.databaseUrl;
  if (!_db && dbUrl) {
    try {
      _client = postgres(dbUrl, {
        max: 5,
        idle_timeout: 15,
        connect_timeout: 5,
        prepare: false,
        ssl: { rejectUnauthorized: false }
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  let db = null;
  try {
    db = await getDb();
  } catch (err) {
    console.warn("[Database] getDb error:", err);
  }
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod", "passwordHash"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet
    });
  } catch (error) {
    console.warn("[Database] Failed to upsert user:", error);
  }
}
async function getUserByOpenId(openId) {
  let db = null;
  try {
    db = await getDb();
  } catch (err) {
    console.warn("[Database] getDb error:", err);
    return void 0;
  }
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  try {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result.length > 0 ? result[0] : void 0;
  } catch (error) {
    console.warn("[Database] getUserByOpenId error:", error);
    return void 0;
  }
}
async function getUserByEmail(email) {
  let db = null;
  try {
    db = await getDb();
  } catch (err) {
    console.warn("[Database] getDb error:", err);
    return void 0;
  }
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  try {
    const result = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    return result.length > 0 ? result[0] : void 0;
  } catch (error) {
    console.warn("[Database] getUserByEmail error:", error);
    return void 0;
  }
}

// server/_core/sdk.ts
var SDKServer = class {
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret || "citycare_super_secret_jwt_key_2026";
    return new TextEncoder().encode(secret);
  }
  /**
   * Sign a JWT session token
   */
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId || "citycare",
      name: payload.name || "CityCare User",
      email: payload.email || "",
      role: payload.role || "user"
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId || "citycare",
        name: options.name || "",
        email: options.email || "",
        role: options.role || "user"
      },
      options
    );
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name, email, role } = payload;
      if (typeof openId !== "string" || !openId) {
        return null;
      }
      return {
        openId,
        appId: typeof appId === "string" ? appId : "citycare",
        name: typeof name === "string" ? name : "User",
        email: typeof email === "string" ? email : null,
        role: role === "admin" ? "admin" : "user"
      };
    } catch {
      return null;
    }
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid or missing session cookie");
    }
    const signedInAt = /* @__PURE__ */ new Date();
    let user = void 0;
    try {
      user = await Promise.race([
        getUserByOpenId(session.openId),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("DB Timeout")), 1500)
        )
      ]);
    } catch {
      user = void 0;
    }
    if (!user) {
      return {
        id: session.openId === "admin-01" ? 1 : 2,
        openId: session.openId,
        name: session.name || (session.role === "admin" ? "Operations Administrator" : "Citizen User"),
        email: session.email || (session.role === "admin" ? "admin@gmail.com" : "user@gmail.com"),
        loginMethod: "local",
        role: session.role || "user",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        lastSignedIn: signedInAt
      };
    }
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/authUtils.ts
import crypto2 from "crypto";
function hashPassword(password) {
  const salt = crypto2.randomBytes(16).toString("hex");
  const hash = crypto2.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  if (!storedHash) {
    return password === "123456";
  }
  if (!storedHash.includes(":")) {
    return password === storedHash || password === "123456";
  }
  try {
    const [salt, key] = storedHash.split(":");
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto2.scryptSync(password, salt, 64);
    return crypto2.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return password === "123456";
  }
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/departments.ts
import { asc as asc2 } from "drizzle-orm";

// server/routers/issues.ts
import { and, asc, count, desc, eq as eq2, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { z as z2 } from "zod";

// server/_core/map.ts
function getMapsConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Google Maps proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey
  };
}
async function makeRequest(endpoint, params = {}, options = {}) {
  const { baseUrl, apiKey } = getMapsConfig();
  const url = new URL(`${baseUrl}/v1/maps/proxy${endpoint}`);
  url.searchParams.append("key", apiKey);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== void 0 && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  const response = await fetch(url.toString(), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : void 0
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Maps API request failed (${response.status} ${response.statusText}): ${errorText}`
    );
  }
  return await response.json();
}

// server/storage.ts
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  const key = appendHashSuffix(normalizeKey(relKey));
  if (!forgeUrl || !forgeKey) {
    const base64Data = typeof data === "string" ? Buffer.from(data).toString("base64") : Buffer.from(data).toString("base64");
    const dataUri = `data:${contentType};base64,${base64Data}`;
    return { key, url: dataUri };
  }
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}

// server/mockDb.ts
var initialDepartments = [
  { id: 1, name: "Roads & Transport", slug: "roads-transport", createdAt: new Date(Date.now() - 30 * 864e5) },
  { id: 2, name: "Sanitation", slug: "sanitation", createdAt: new Date(Date.now() - 30 * 864e5) },
  { id: 3, name: "Water & Sewage", slug: "water-sewage", createdAt: new Date(Date.now() - 30 * 864e5) },
  { id: 4, name: "Electricity & Streetlights", slug: "electricity-streetlights", createdAt: new Date(Date.now() - 30 * 864e5) },
  { id: 5, name: "Parks & Public Spaces", slug: "parks-public-spaces", createdAt: new Date(Date.now() - 30 * 864e5) },
  { id: 6, name: "Other", slug: "other", createdAt: new Date(Date.now() - 30 * 864e5) }
];
var initialIssues = [
  {
    id: 1,
    referenceCode: "CC-2026-000101",
    reporterId: 1,
    isAnonymous: false,
    categorySlug: "pothole",
    departmentId: 1,
    title: "Large pothole near Miyapur junction",
    description: "A deep pothole is affecting the left lane and is difficult to see after dark. Multiple vehicles have suffered tire damage.",
    status: "in_progress",
    priority: "high",
    latitude: 17.4968,
    longitude: 78.3565,
    address: "Miyapur Main Road, Hyderabad",
    upvoteCount: 82,
    createdAt: new Date(Date.now() - 4 * 864e5),
    updatedAt: new Date(Date.now() - 1 * 864e5),
    resolvedAt: null,
    slaDeadline: new Date(Date.now() + 2 * 864e5),
    closedAt: null,
    citizenVerification: "pending",
    verificationNote: null
  },
  {
    id: 2,
    referenceCode: "CC-2026-000102",
    reporterId: 2,
    isAnonymous: false,
    categorySlug: "drainage",
    departmentId: 3,
    title: "Drainage blockage and water logging on Hafeezpet road",
    description: "Water is collecting near the main bus stop after light rain. Stagnant sewage water causing foul odor and health concerns.",
    status: "submitted",
    priority: "urgent",
    latitude: 17.4941,
    longitude: 78.3621,
    address: "Hafeezpet Main Road, Hyderabad",
    upvoteCount: 61,
    createdAt: new Date(Date.now() - 2 * 864e5),
    updatedAt: new Date(Date.now() - 2 * 864e5),
    resolvedAt: null,
    slaDeadline: new Date(Date.now() + 1 * 864e5),
    closedAt: null,
    citizenVerification: "pending",
    verificationNote: null
  },
  {
    id: 3,
    referenceCode: "CC-2026-000103",
    reporterId: 1,
    isAnonymous: false,
    categorySlug: "streetlight",
    departmentId: 4,
    title: "Streetlights out along 3rd Avenue",
    description: "A series of 4 consecutive streetlights have not been working for past 3 days, making the pedestrian walkway completely dark.",
    status: "acknowledged",
    priority: "medium",
    latitude: 17.5002,
    longitude: 78.3511,
    address: "3rd Avenue, Miyapur, Hyderabad",
    upvoteCount: 28,
    createdAt: new Date(Date.now() - 3 * 864e5),
    updatedAt: new Date(Date.now() - 1 * 864e5),
    resolvedAt: null,
    slaDeadline: new Date(Date.now() + 3 * 864e5),
    closedAt: null,
    citizenVerification: "pending",
    verificationNote: null
  },
  {
    id: 4,
    referenceCode: "CC-2026-000104",
    reporterId: 3,
    isAnonymous: false,
    categorySlug: "garbage",
    departmentId: 2,
    title: "Overflowing community waste bin near market",
    description: "Waste collection point was cleared and sanitation team sanitized the surrounding pavement area.",
    status: "resolved",
    priority: "low",
    latitude: 17.4892,
    longitude: 78.3584,
    address: "Madinaguda Circle, Hyderabad",
    upvoteCount: 42,
    createdAt: new Date(Date.now() - 6 * 864e5),
    updatedAt: new Date(Date.now() - 1 * 864e5),
    resolvedAt: new Date(Date.now() - 1 * 864e5),
    slaDeadline: new Date(Date.now() + 4 * 864e5),
    closedAt: null,
    citizenVerification: "pending",
    verificationNote: null
  },
  {
    id: 5,
    referenceCode: "CC-2026-000105",
    reporterId: 1,
    isAnonymous: false,
    categorySlug: "water_leak",
    departmentId: 3,
    title: "Pipeline leakage beside Central Park gate",
    description: "Potable water pipeline burst causing clean water wastage and slippery surface on walkway.",
    status: "in_progress",
    priority: "high",
    latitude: 17.5032,
    longitude: 78.3691,
    address: "Miyapur Park Road, Hyderabad",
    upvoteCount: 34,
    createdAt: new Date(Date.now() - 5 * 864e5),
    updatedAt: new Date(Date.now() - 2 * 864e5),
    resolvedAt: null,
    slaDeadline: new Date(Date.now() + 1 * 864e5),
    closedAt: null,
    citizenVerification: "pending",
    verificationNote: null
  },
  {
    id: 6,
    referenceCode: "CC-2026-000106",
    reporterId: 4,
    isAnonymous: true,
    categorySlug: "tree_hazard",
    departmentId: 5,
    title: "Fallen tree branch obstructing pedestrian path",
    description: "Heavy storm branch fell across sidewalk. Walkers are forced onto the main traffic lane.",
    status: "submitted",
    priority: "medium",
    latitude: 17.4924,
    longitude: 78.3477,
    address: "Miyapur Lake Road, Hyderabad",
    upvoteCount: 19,
    createdAt: new Date(Date.now() - 1 * 864e5),
    updatedAt: new Date(Date.now() - 1 * 864e5),
    resolvedAt: null,
    slaDeadline: new Date(Date.now() + 3 * 864e5),
    closedAt: null,
    citizenVerification: "pending",
    verificationNote: null
  },
  {
    id: 7,
    referenceCode: "CC-2026-000107",
    reporterId: 1,
    isAnonymous: false,
    categorySlug: "graffiti",
    departmentId: 1,
    title: "Vandalism and unauthorized posters on overpass pillars",
    description: "Fresh spray graffiti and defaced civic directional signage on flyover pillar #12.",
    status: "resolved",
    priority: "low",
    latitude: 17.4988,
    longitude: 78.3533,
    address: "Metro Pillar 12, Miyapur, Hyderabad",
    upvoteCount: 15,
    createdAt: new Date(Date.now() - 8 * 864e5),
    updatedAt: new Date(Date.now() - 3 * 864e5),
    resolvedAt: new Date(Date.now() - 3 * 864e5),
    slaDeadline: new Date(Date.now() + 2 * 864e5),
    closedAt: new Date(Date.now() - 2 * 864e5),
    citizenVerification: "accepted",
    verificationNote: "Cleaned and repainted nicely."
  }
];
var initialPhotos = [
  { id: 1, issueId: 4, url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=60", kind: "before", createdAt: new Date(Date.now() - 6 * 864e5) },
  { id: 2, issueId: 4, url: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=600&auto=format&fit=crop&q=60", kind: "after", createdAt: new Date(Date.now() - 1 * 864e5) },
  { id: 3, issueId: 1, url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60", kind: "before", createdAt: new Date(Date.now() - 4 * 864e5) },
  { id: 4, issueId: 7, url: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&auto=format&fit=crop&q=60", kind: "before", createdAt: new Date(Date.now() - 8 * 864e5) }
];
var initialHistory = [
  { id: 1, issueId: 1, fromStatus: null, toStatus: "submitted", changedById: 1, note: "Report submitted by citizen", createdAt: new Date(Date.now() - 4 * 864e5) },
  { id: 2, issueId: 1, fromStatus: "submitted", toStatus: "acknowledged", changedById: 1, note: "Verified by Roads Department dispatch team", createdAt: new Date(Date.now() - 3 * 864e5) },
  { id: 3, issueId: 1, fromStatus: "acknowledged", toStatus: "in_progress", changedById: 1, note: "Road maintenance crew dispatched with asphalt patcher", createdAt: new Date(Date.now() - 1 * 864e5) },
  { id: 4, issueId: 4, fromStatus: null, toStatus: "submitted", changedById: 3, note: "Report submitted", createdAt: new Date(Date.now() - 6 * 864e5) },
  { id: 5, issueId: 4, fromStatus: "submitted", toStatus: "in_progress", changedById: 1, note: "Sanitation truck assigned", createdAt: new Date(Date.now() - 4 * 864e5) },
  { id: 6, issueId: 4, fromStatus: "in_progress", toStatus: "resolved", changedById: 1, note: "Waste collected and bin disinfected", createdAt: new Date(Date.now() - 1 * 864e5) }
];
var MockDbStore = class {
  issues = [...initialIssues];
  departments = [...initialDepartments];
  photos = [...initialPhotos];
  history = [...initialHistory];
  comments = [];
  upvotes = [
    { issueId: 1, userId: 1 },
    { issueId: 3, userId: 1 },
    { issueId: 5, userId: 1 }
  ];
  nextIssueId = 8;
  nextPhotoId = 5;
  nextHistoryId = 7;
  getIssues() {
    return this.issues;
  }
  getIssueById(id) {
    return this.issues.find((i) => i.id === id) || null;
  }
  getDepartment(id) {
    if (!id) return null;
    return this.departments.find((d) => d.id === id) || null;
  }
  getPhotos(issueId) {
    return this.photos.filter((p) => p.issueId === issueId);
  }
  getHistory(issueId) {
    return this.history.filter((h) => h.issueId === issueId);
  }
  getComments(issueId) {
    return this.comments.filter((c) => c.issueId === issueId);
  }
  hasUserUpvoted(issueId, userId) {
    return this.upvotes.some((u) => u.issueId === issueId && u.userId === userId);
  }
  toggleUpvote(issueId, userId) {
    const idx = this.upvotes.findIndex((u) => u.issueId === issueId && u.userId === userId);
    const issue = this.getIssueById(issueId);
    if (idx !== -1) {
      this.upvotes.splice(idx, 1);
      if (issue) issue.upvoteCount = Math.max(0, issue.upvoteCount - 1);
      return false;
    } else {
      this.upvotes.push({ issueId, userId });
      if (issue) issue.upvoteCount += 1;
      return true;
    }
  }
  createIssue(params) {
    const id = this.nextIssueId++;
    const code = `CC-2026-${String(id).padStart(6, "0")}`;
    const slaHours = params.priority === "urgent" ? 24 : params.priority === "high" ? 72 : params.priority === "medium" ? 120 : 168;
    const newIssue = {
      id,
      referenceCode: code,
      reporterId: params.reporterId,
      isAnonymous: params.isAnonymous,
      categorySlug: params.categorySlug,
      departmentId: params.departmentId,
      title: params.title,
      description: params.description,
      status: "submitted",
      priority: params.priority,
      latitude: params.latitude,
      longitude: params.longitude,
      address: params.address,
      upvoteCount: 1,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      resolvedAt: null,
      slaDeadline: new Date(Date.now() + slaHours * 36e5),
      closedAt: null,
      citizenVerification: "pending",
      verificationNote: null
    };
    this.issues.unshift(newIssue);
    this.upvotes.push({ issueId: id, userId: params.reporterId });
    this.history.push({
      id: this.nextHistoryId++,
      issueId: id,
      fromStatus: null,
      toStatus: "submitted",
      changedById: params.reporterId,
      note: "Report received from citizen",
      createdAt: /* @__PURE__ */ new Date()
    });
    for (const url of params.photoUrls) {
      this.photos.push({
        id: this.nextPhotoId++,
        issueId: id,
        url,
        kind: "before",
        createdAt: /* @__PURE__ */ new Date()
      });
    }
    return { id, referenceCode: code };
  }
  updateIssueStatus(params) {
    const issue = this.getIssueById(params.issueId);
    if (!issue) return false;
    const prevStatus = issue.status;
    issue.status = params.status;
    issue.updatedAt = /* @__PURE__ */ new Date();
    if (params.departmentId) issue.departmentId = params.departmentId;
    if (params.status === "resolved") issue.resolvedAt = /* @__PURE__ */ new Date();
    if (params.status === "closed") issue.closedAt = /* @__PURE__ */ new Date();
    if (params.afterPhotoUrl) {
      this.photos.push({
        id: this.nextPhotoId++,
        issueId: params.issueId,
        url: params.afterPhotoUrl,
        kind: "after",
        createdAt: /* @__PURE__ */ new Date()
      });
    }
    this.history.push({
      id: this.nextHistoryId++,
      issueId: params.issueId,
      fromStatus: prevStatus,
      toStatus: params.status,
      changedById: params.changedById,
      note: params.note || null,
      createdAt: /* @__PURE__ */ new Date()
    });
    return true;
  }
  verifyResolution(params) {
    const issue = this.getIssueById(params.issueId);
    if (!issue) return null;
    const nextStatus = params.result === "accepted" ? "closed" : "reopened";
    issue.citizenVerification = params.result;
    issue.verificationNote = params.note || null;
    issue.status = nextStatus;
    issue.updatedAt = /* @__PURE__ */ new Date();
    if (params.result === "accepted") issue.closedAt = /* @__PURE__ */ new Date();
    this.history.push({
      id: this.nextHistoryId++,
      issueId: params.issueId,
      fromStatus: "resolved",
      toStatus: nextStatus,
      changedById: params.changedById,
      note: params.note || (params.result === "accepted" ? "Citizen verified resolution" : "Citizen reported issue still persists"),
      createdAt: /* @__PURE__ */ new Date()
    });
    return nextStatus;
  }
  getStats() {
    const total = this.issues.length;
    const statusCounts = /* @__PURE__ */ new Map();
    const categoryCounts = /* @__PURE__ */ new Map();
    for (const issue of this.issues) {
      statusCounts.set(issue.status, (statusCounts.get(issue.status) || 0) + 1);
      categoryCounts.set(issue.categorySlug, (categoryCounts.get(issue.categorySlug) || 0) + 1);
    }
    const byStatus = Array.from(statusCounts.entries()).map(([status, count3]) => ({ status, count: count3 }));
    const byCategory = Array.from(categoryCounts.entries()).map(([category, count3]) => ({ category, count: count3 }));
    return { byStatus, byCategory, total };
  }
};
var mockDb = new MockDbStore();

// server/routers/issues.ts
var categorySlug = z2.enum(["pothole", "garbage", "streetlight", "water_leak", "graffiti", "stray_animal", "tree_hazard", "drainage", "illegal_dumping", "other"]);
var issueStatus = z2.enum(["submitted", "acknowledged", "in_progress", "resolved", "rejected", "reopened", "closed"]);
var priority = z2.enum(["low", "medium", "high", "urgent"]);
var verification = z2.enum(["accepted", "rejected"]);
var defaultDepartments = [
  { name: "Roads & Transport", slug: "roads-transport" },
  { name: "Sanitation", slug: "sanitation" },
  { name: "Water & Sewage", slug: "water-sewage" },
  { name: "Electricity & Streetlights", slug: "electricity-streetlights" },
  { name: "Parks & Public Spaces", slug: "parks-public-spaces" },
  { name: "Other", slug: "other" }
];
var createIssueInput = z2.object({
  title: z2.string().trim().min(4).max(200),
  description: z2.string().trim().min(4).max(5e3),
  categorySlug,
  lat: z2.number().finite().gte(-90).lte(90),
  lng: z2.number().finite().gte(-180).lte(180),
  photoUrls: z2.array(z2.string()).max(3).default([]),
  isAnonymous: z2.boolean().default(false),
  priority: priority.default("medium"),
  address: z2.string().trim().max(500).nullable().optional()
});
function departmentFor(category) {
  if (["pothole", "graffiti"].includes(category)) return "roads-transport";
  if (["garbage", "illegal_dumping", "drainage"].includes(category)) return "sanitation";
  if (["water_leak"].includes(category)) return "water-sewage";
  if (["streetlight", "electricity"].includes(category)) return "electricity-streetlights";
  if (["tree_hazard", "stray_animal"].includes(category)) return "parks-public-spaces";
  return "other";
}
function referenceCode(year, id) {
  return `CC-${year}-${String(id).padStart(6, "0")}`;
}
function withinDuplicateRadius(lat, lng, candidateLat, candidateLng) {
  const latMeters = (lat - candidateLat) * 111e3;
  const lngMeters = (lng - candidateLng) * 111e3 * Math.cos(lat * Math.PI / 180);
  return Math.sqrt(latMeters ** 2 + lngMeters ** 2) <= 75;
}
async function bestEffortAddress(lat, lng) {
  try {
    const result = await makeRequest("/maps/api/geocode/json", { latlng: `${lat},${lng}` });
    return result.results?.[0]?.formatted_address ?? null;
  } catch {
    return null;
  }
}
var issuesRouter = router({
  nearbyDuplicates: protectedProcedure.input(z2.object({ categorySlug, lat: z2.number(), lng: z2.number(), radiusMeters: z2.number().positive().max(500).default(75) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      const all = mockDb.getIssues();
      return all.filter((i) => i.categorySlug === input.categorySlug && !["resolved", "rejected"].includes(i.status)).filter((i) => withinDuplicateRadius(input.lat, input.lng, i.latitude, i.longitude)).sort((a, b) => b.upvoteCount - a.upvoteCount);
    }
    const delta = input.radiusMeters / 111e3;
    const candidates = await db.select({ id: issues.id, referenceCode: issues.referenceCode, title: issues.title, status: issues.status, latitude: issues.latitude, longitude: issues.longitude, upvoteCount: issues.upvoteCount, address: issues.address }).from(issues).where(and(eq2(issues.categorySlug, input.categorySlug), ne(issues.status, "resolved"), ne(issues.status, "rejected"), gte(issues.latitude, input.lat - delta), lte(issues.latitude, input.lat + delta), gte(issues.longitude, input.lng - delta), lte(issues.longitude, input.lng + delta))).limit(20);
    return candidates.filter((item) => withinDuplicateRadius(input.lat, input.lng, item.latitude, item.longitude)).sort((a, b) => b.upvoteCount - a.upvoteCount);
  }),
  all: publicProcedure.input(z2.object({
    statuses: z2.array(issueStatus).optional(),
    categories: z2.array(categorySlug).optional(),
    departmentId: z2.number().int().positive().optional(),
    lat: z2.number().optional(),
    lng: z2.number().optional(),
    radiusKm: z2.number().positive().max(50).default(10),
    sort: z2.enum(["newest", "most_upvoted", "priority"]).default("newest"),
    limit: z2.number().int().min(1).max(100).default(50),
    offset: z2.number().int().min(0).default(0)
  }).default({ radiusKm: 10, sort: "newest", limit: 50, offset: 0 })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      let items2 = [...mockDb.getIssues()];
      if (input.statuses?.length) {
        items2 = items2.filter((i) => input.statuses.includes(i.status));
      }
      if (input.categories?.length) {
        items2 = items2.filter((i) => input.categories.includes(i.categorySlug));
      }
      if (input.departmentId) {
        items2 = items2.filter((i) => i.departmentId === input.departmentId);
      }
      if (input.sort === "most_upvoted") {
        items2.sort((a, b) => b.upvoteCount - a.upvoteCount);
      } else if (input.sort === "priority") {
        const pOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        items2.sort((a, b) => (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0));
      } else {
        items2.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      const paginated = items2.slice(input.offset, input.offset + input.limit);
      return { items: paginated, total: items2.length, offset: input.offset, limit: input.limit };
    }
    const filters = [];
    if (input.statuses?.length) filters.push(inArray(issues.status, input.statuses));
    if (input.categories?.length) filters.push(inArray(issues.categorySlug, input.categories));
    if (input.departmentId) filters.push(eq2(issues.departmentId, input.departmentId));
    if (input.lat !== void 0 && input.lng !== void 0) {
      const delta = input.radiusKm / 111;
      filters.push(gte(issues.latitude, input.lat - delta), lte(issues.latitude, input.lat + delta), gte(issues.longitude, input.lng - delta), lte(issues.longitude, input.lng + delta));
    }
    const orderBy = input.sort === "most_upvoted" ? desc(issues.upvoteCount) : input.sort === "priority" ? desc(sql`CASE WHEN ${issues.priority} = 'urgent' THEN 4 WHEN ${issues.priority} = 'high' THEN 3 WHEN ${issues.priority} = 'medium' THEN 2 ELSE 1 END`) : desc(issues.createdAt);
    const where = filters.length ? and(...filters) : void 0;
    const [items, totalRows] = await Promise.all([
      db.select().from(issues).where(where).orderBy(orderBy).limit(input.limit).offset(input.offset),
      db.select({ value: count() }).from(issues).where(where)
    ]);
    return { items, total: totalRows[0]?.value ?? 0, offset: input.offset, limit: input.limit };
  }),
  list: publicProcedure.input(z2.object({
    statuses: z2.array(issueStatus).optional(),
    categories: z2.array(categorySlug).optional(),
    departmentId: z2.number().int().positive().optional(),
    lat: z2.number().optional(),
    lng: z2.number().optional(),
    radiusKm: z2.number().positive().max(50).default(10),
    sort: z2.enum(["newest", "most_upvoted", "priority"]).default("newest"),
    limit: z2.number().int().min(1).max(100).default(50),
    offset: z2.number().int().min(0).default(0)
  }).default({ radiusKm: 10, sort: "newest", limit: 50, offset: 0 })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      let items2 = [...mockDb.getIssues()];
      if (input.statuses?.length) {
        items2 = items2.filter((i) => input.statuses.includes(i.status));
      }
      if (input.categories?.length) {
        items2 = items2.filter((i) => input.categories.includes(i.categorySlug));
      }
      if (input.departmentId) {
        items2 = items2.filter((i) => i.departmentId === input.departmentId);
      }
      if (input.sort === "most_upvoted") {
        items2.sort((a, b) => b.upvoteCount - a.upvoteCount);
      } else if (input.sort === "priority") {
        const pOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        items2.sort((a, b) => (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0));
      } else {
        items2.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      const paginated = items2.slice(input.offset, input.offset + input.limit);
      return { items: paginated, total: items2.length, offset: input.offset, limit: input.limit };
    }
    const filters = [];
    if (input.statuses?.length) filters.push(inArray(issues.status, input.statuses));
    if (input.categories?.length) filters.push(inArray(issues.categorySlug, input.categories));
    if (input.departmentId) filters.push(eq2(issues.departmentId, input.departmentId));
    if (input.lat !== void 0 && input.lng !== void 0) {
      const delta = input.radiusKm / 111;
      filters.push(gte(issues.latitude, input.lat - delta), lte(issues.latitude, input.lat + delta), gte(issues.longitude, input.lng - delta), lte(issues.longitude, input.lng + delta));
    }
    const orderBy = input.sort === "most_upvoted" ? desc(issues.upvoteCount) : input.sort === "priority" ? desc(sql`CASE WHEN ${issues.priority} = 'urgent' THEN 4 WHEN ${issues.priority} = 'high' THEN 3 WHEN ${issues.priority} = 'medium' THEN 2 ELSE 1 END`) : desc(issues.createdAt);
    const where = filters.length ? and(...filters) : void 0;
    const [items, totalRows] = await Promise.all([
      db.select().from(issues).where(where).orderBy(orderBy).limit(input.limit).offset(input.offset),
      db.select({ value: count() }).from(issues).where(where)
    ]);
    return { items, total: totalRows[0]?.value ?? 0, offset: input.offset, limit: input.limit };
  }),
  getById: publicProcedure.input(z2.object({ id: z2.number().int().positive() })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      const issue2 = mockDb.getIssueById(input.id);
      if (!issue2) return null;
      const photos2 = mockDb.getPhotos(input.id);
      const history2 = mockDb.getHistory(input.id);
      const comments2 = mockDb.getComments(input.id);
      const department2 = mockDb.getDepartment(issue2.departmentId);
      const reporter2 = { id: issue2.reporterId ?? 1, name: "Community Member" };
      const hasUpvoted = mockDb.hasUserUpvoted(input.id, ctx.user?.id ?? 1);
      return { issue: issue2, photos: photos2, history: history2, comments: comments2, department: department2, reporter: reporter2, hasUpvoted };
    }
    const issue = (await db.select().from(issues).where(eq2(issues.id, input.id)).limit(1))[0];
    if (!issue) return null;
    const [photos, history, comments, department, reporter] = await Promise.all([
      db.select().from(issuePhotos).where(eq2(issuePhotos.issueId, input.id)).orderBy(asc(issuePhotos.createdAt)),
      db.select().from(issueStatusHistory).where(eq2(issueStatusHistory.issueId, input.id)).orderBy(asc(issueStatusHistory.createdAt)),
      db.select().from(issueComments).where(and(eq2(issueComments.issueId, input.id), ctx.user?.role === "admin" ? void 0 : eq2(issueComments.isInternal, false))).orderBy(asc(issueComments.createdAt)),
      issue.departmentId ? db.select().from(departments).where(eq2(departments.id, issue.departmentId)).limit(1) : Promise.resolve([]),
      issue.reporterId ? db.select({ id: users.id, name: users.name }).from(users).where(eq2(users.id, issue.reporterId)).limit(1) : Promise.resolve([])
    ]);
    const upvote = ctx.user ? await db.select({ id: issueUpvotes.id }).from(issueUpvotes).where(and(eq2(issueUpvotes.issueId, input.id), eq2(issueUpvotes.userId, ctx.user.id))).limit(1) : [];
    return { issue, photos, history, comments, department: department[0] ?? null, reporter: reporter[0] ?? null, hasUpvoted: upvote.length > 0 };
  }),
  create: protectedProcedure.input(createIssueInput).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      const all = mockDb.getIssues();
      const duplicate2 = all.filter((i) => i.categorySlug === input.categorySlug && !["resolved", "rejected"].includes(i.status)).find((i) => withinDuplicateRadius(input.lat, input.lng, i.latitude, i.longitude));
      if (duplicate2) return { possibleDuplicate: true, existingIssue: duplicate2 };
      const deptSlug = departmentFor(input.categorySlug);
      const dept = mockDb.departments.find((d) => d.slug === deptSlug);
      const created = mockDb.createIssue({
        reporterId: ctx.user.id,
        isAnonymous: input.isAnonymous,
        categorySlug: input.categorySlug,
        departmentId: dept?.id ?? 1,
        title: input.title,
        description: input.description,
        priority: input.priority,
        latitude: input.lat,
        longitude: input.lng,
        address: input.address || null,
        photoUrls: input.photoUrls
      });
      return { possibleDuplicate: false, issueId: created.id, referenceCode: created.referenceCode };
    }
    const delta = 75 / 111e3;
    const recent = await db.select({ id: issues.id, referenceCode: issues.referenceCode, title: issues.title, status: issues.status, latitude: issues.latitude, longitude: issues.longitude, upvoteCount: issues.upvoteCount }).from(issues).where(and(eq2(issues.categorySlug, input.categorySlug), ne(issues.status, "resolved"), ne(issues.status, "rejected"), gte(issues.latitude, input.lat - delta), lte(issues.latitude, input.lat + delta), gte(issues.longitude, input.lng - delta), lte(issues.longitude, input.lng + delta))).limit(20);
    const duplicate = recent.find((item) => withinDuplicateRadius(input.lat, input.lng, item.latitude, item.longitude));
    if (duplicate) return { possibleDuplicate: true, existingIssue: duplicate };
    const address = input.address ?? await bestEffortAddress(input.lat, input.lng);
    const department = (await db.select().from(departments).where(eq2(departments.slug, departmentFor(input.categorySlug))).limit(1))[0];
    const slaHours = input.priority === "urgent" ? 24 : input.priority === "high" ? 72 : input.priority === "medium" ? 120 : 168;
    const inserted = await db.insert(issues).values({
      referenceCode: "PENDING",
      reporterId: ctx.user.id,
      isAnonymous: input.isAnonymous,
      categorySlug: input.categorySlug,
      departmentId: department?.id ?? null,
      title: input.title,
      description: input.description,
      priority: input.priority,
      latitude: input.lat,
      longitude: input.lng,
      address,
      slaDeadline: new Date(Date.now() + slaHours * 60 * 60 * 1e3)
    }).returning({ id: issues.id });
    const issueId = inserted[0]?.id;
    if (!issueId) throw new Error("Issue creation failed");
    const code = referenceCode((/* @__PURE__ */ new Date()).getFullYear(), issueId);
    await db.update(issues).set({ referenceCode: code }).where(eq2(issues.id, issueId));
    await db.insert(issueStatusHistory).values({ issueId, fromStatus: null, toStatus: "submitted", changedById: ctx.user.id, note: "Report received from citizen" });
    if (input.photoUrls.length) await db.insert(issuePhotos).values(input.photoUrls.map((url) => ({ issueId, url, kind: "before" })));
    await db.insert(notifications).values({ userId: ctx.user.id, issueId, title: "We received your report", body: `Your civic issue ${code} is now submitted.` });
    return { possibleDuplicate: false, issueId, referenceCode: code };
  }),
  uploadPhoto: protectedProcedure.input(z2.object({ filename: z2.string().regex(/\.(png|jpe?g|webp)$/i), contentType: z2.enum(["image/jpeg", "image/png", "image/webp"]), dataBase64: z2.string().max(8e6) })).mutation(async ({ input, ctx }) => {
    const buffer = Buffer.from(input.dataBase64, "base64");
    if (buffer.length > 6 * 1024 * 1024) throw new Error("Image must be 6 MB or smaller");
    const uploaded = await storagePut(`citycare/${ctx.user.id}/${input.filename}`, buffer, input.contentType);
    return uploaded;
  }),
  verifyResolution: protectedProcedure.input(z2.object({ issueId: z2.number().int().positive(), result: verification, note: z2.string().trim().max(2e3).optional() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      const nextStatus2 = mockDb.verifyResolution({ issueId: input.issueId, result: input.result, changedById: ctx.user.id, note: input.note });
      if (!nextStatus2) throw new Error("Issue not found");
      return { success: true, status: nextStatus2 };
    }
    const issue = (await db.select().from(issues).where(and(eq2(issues.id, input.issueId), eq2(issues.reporterId, ctx.user.id))).limit(1))[0];
    if (!issue) throw new Error("Issue not found");
    const nextStatus = input.result === "accepted" ? "closed" : "reopened";
    await db.update(issues).set({ citizenVerification: input.result, verificationNote: input.note ?? null, status: nextStatus, closedAt: input.result === "accepted" ? /* @__PURE__ */ new Date() : null }).where(eq2(issues.id, input.issueId));
    await db.insert(issueStatusHistory).values({ issueId: input.issueId, fromStatus: issue.status, toStatus: nextStatus, changedById: ctx.user.id, note: input.note });
    if (issue.departmentId) {
      const admins = await db.select({ id: users.id }).from(users).where(eq2(users.role, "admin"));
      if (admins.length) await db.insert(notifications).values(admins.map((admin) => ({ userId: admin.id, issueId: input.issueId, title: input.result === "accepted" ? "Citizen confirmed the resolution" : "Citizen reopened an issue", body: `${issue.referenceCode} was marked ${nextStatus}.` })));
    }
    return { success: true, status: nextStatus };
  }),
  myReports: protectedProcedure.input(z2.object({ status: issueStatus.optional(), limit: z2.number().int().min(1).max(50).default(25) }).default({ limit: 25 })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      const myIssues = mockDb.getIssues().filter((i) => i.reporterId === ctx.user.id || i.reporterId === 1);
      if (input.status) {
        return myIssues.filter((i) => i.status === input.status).slice(0, input.limit);
      }
      return myIssues.slice(0, input.limit);
    }
    return db.select().from(issues).where(input.status ? and(eq2(issues.reporterId, ctx.user.id), eq2(issues.status, input.status)) : eq2(issues.reporterId, ctx.user.id)).orderBy(desc(issues.createdAt)).limit(input.limit);
  }),
  upvote: protectedProcedure.input(z2.object({ issueId: z2.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      const confirmed = mockDb.toggleUpvote(input.issueId, ctx.user.id);
      return { confirmed };
    }
    const existing = await db.select({ id: issueUpvotes.id }).from(issueUpvotes).where(and(eq2(issueUpvotes.issueId, input.issueId), eq2(issueUpvotes.userId, ctx.user.id))).limit(1);
    if (existing.length) {
      await db.delete(issueUpvotes).where(eq2(issueUpvotes.id, existing[0].id));
      await db.update(issues).set({ upvoteCount: sql`GREATEST(${issues.upvoteCount} - 1, 0)` }).where(eq2(issues.id, input.issueId));
      return { confirmed: false };
    }
    await db.insert(issueUpvotes).values({ issueId: input.issueId, userId: ctx.user.id });
    await db.update(issues).set({ upvoteCount: sql`${issues.upvoteCount} + 1` }).where(eq2(issues.id, input.issueId));
    return { confirmed: true };
  }),
  addComment: protectedProcedure.input(z2.object({ issueId: z2.number().int().positive(), body: z2.string().trim().min(1).max(2e3), isInternal: z2.boolean().default(false) })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      mockDb.comments.push({
        id: Date.now(),
        issueId: input.issueId,
        authorId: ctx.user.id,
        body: input.body,
        isInternal: ctx.user.role === "admin" ? input.isInternal : false,
        createdAt: /* @__PURE__ */ new Date()
      });
      return { id: Date.now() };
    }
    const result = await db.insert(issueComments).values({ issueId: input.issueId, authorId: ctx.user.id, body: input.body, isInternal: ctx.user.role === "admin" ? input.isInternal : false }).returning({ id: issueComments.id });
    return { id: Number(result[0]?.id ?? 0) };
  }),
  updateStatus: adminProcedure.input(z2.object({ issueId: z2.number().int().positive(), status: issueStatus, note: z2.string().trim().max(2e3).optional(), departmentId: z2.number().int().positive().optional(), afterPhotoUrl: z2.string().optional() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      if (input.status === "resolved" && !input.afterPhotoUrl) {
        const photos = mockDb.getPhotos(input.issueId);
        if (!photos.some((p) => p.kind === "after")) {
          throw new Error("An after photo is required before resolving an issue");
        }
      }
      mockDb.updateIssueStatus({
        issueId: input.issueId,
        status: input.status,
        changedById: ctx.user.id,
        note: input.note,
        departmentId: input.departmentId,
        afterPhotoUrl: input.afterPhotoUrl
      });
      return { success: true };
    }
    const existing = (await db.select().from(issues).where(eq2(issues.id, input.issueId)).limit(1))[0];
    if (!existing) throw new Error("Issue not found");
    if (input.status === "resolved" && !input.afterPhotoUrl) {
      const after = await db.select({ id: issuePhotos.id }).from(issuePhotos).where(and(eq2(issuePhotos.issueId, input.issueId), eq2(issuePhotos.kind, "after"))).limit(1);
      if (!after.length) throw new Error("An after photo is required before resolving an issue");
    }
    if (input.afterPhotoUrl) await db.insert(issuePhotos).values({ issueId: input.issueId, url: input.afterPhotoUrl, kind: "after" });
    await db.update(issues).set({ status: input.status, departmentId: input.departmentId ?? existing.departmentId, resolvedAt: input.status === "resolved" ? /* @__PURE__ */ new Date() : null }).where(eq2(issues.id, input.issueId));
    await db.insert(issueStatusHistory).values({ issueId: input.issueId, fromStatus: existing.status, toStatus: input.status, changedById: ctx.user.id, note: input.note });
    if (existing.reporterId) await db.insert(notifications).values({ userId: existing.reporterId, issueId: input.issueId, title: "Your issue has been updated", body: `Your issue ${existing.referenceCode} is now ${input.status.replaceAll("_", " ")}.` });
    return { success: true };
  }),
  assignDepartment: adminProcedure.input(z2.object({ issueId: z2.number().int().positive(), departmentId: z2.number().int().positive() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      const issue = mockDb.getIssueById(input.issueId);
      if (issue) issue.departmentId = input.departmentId;
      return { success: true };
    }
    await db.update(issues).set({ departmentId: input.departmentId }).where(eq2(issues.id, input.issueId));
    return { success: true };
  }),
  setPriority: adminProcedure.input(z2.object({ issueId: z2.number().int().positive(), priority })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      const issue = mockDb.getIssueById(input.issueId);
      if (issue) issue.priority = input.priority;
      return { success: true };
    }
    await db.update(issues).set({ priority: input.priority }).where(eq2(issues.id, input.issueId));
    return { success: true };
  }),
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return mockDb.getStats();
    }
    const [byStatus, byCategory, total] = await Promise.all([
      db.select({ status: issues.status, count: count() }).from(issues).groupBy(issues.status),
      db.select({ category: issues.categorySlug, count: count() }).from(issues).groupBy(issues.categorySlug).orderBy(desc(count())),
      db.select({ value: count() }).from(issues)
    ]);
    return { byStatus, byCategory, total: total[0]?.value ?? 0 };
  })
});

// server/routers/departments.ts
var departmentsRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return defaultDepartments;
    const rows = await db.select().from(departments).orderBy(asc2(departments.name));
    return rows.length ? rows : defaultDepartments;
  })
});

// server/routers/notifications.ts
import { and as and2, desc as desc2, eq as eq3 } from "drizzle-orm";
import { z as z3 } from "zod";
var notificationsRouter = router({
  list: protectedProcedure.input(z3.object({ limit: z3.number().int().min(1).max(50).default(20), unreadOnly: z3.boolean().default(false) }).default({ limit: 20, unreadOnly: false })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(notifications).where(input.unreadOnly ? and2(eq3(notifications.userId, ctx.user.id), eq3(notifications.read, false)) : eq3(notifications.userId, ctx.user.id)).orderBy(desc2(notifications.createdAt)).limit(input.limit);
  }),
  markRead: protectedProcedure.input(z3.object({ notificationId: z3.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database is not configured");
    await db.update(notifications).set({ read: true }).where(eq3(notifications.id, input.notificationId));
    return { success: true };
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    login: publicProcedure.input(
      z4.object({
        email: z4.string().trim().email("Please enter a valid email address"),
        password: z4.string().min(1, "Password is required"),
        role: z4.enum(["user", "admin"]).optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase().trim();
      const password = input.password.trim();
      let dbUser = await getUserByEmail(email);
      let role = "user";
      let openId = "";
      let name = "";
      let userId = 1;
      if (dbUser) {
        const isValid = verifyPassword(password, dbUser.passwordHash);
        if (!isValid) {
          throw new TRPCError3({
            code: "UNAUTHORIZED",
            message: "Incorrect password. For demo accounts, use password '123456'."
          });
        }
        role = dbUser.role;
        openId = dbUser.openId;
        name = dbUser.name || email.split("@")[0];
        userId = dbUser.id;
        await upsertUser({
          openId,
          lastSignedIn: /* @__PURE__ */ new Date()
        });
      } else {
        if (email === "admin@gmail.com") {
          role = "admin";
          openId = "admin-01";
          name = "Operations Administrator";
        } else if (email === "user@gmail.com") {
          role = "user";
          openId = "user-01";
          name = "Citizen User";
        } else {
          role = input.role || (email.includes("admin") ? "admin" : "user");
          const hex = Buffer.from(email).toString("hex").slice(0, 16);
          openId = `usr_${hex}`;
          name = email.split("@")[0].replace(/[._-]/g, " ");
        }
        if (password !== "123456" && password.length < 6) {
          throw new TRPCError3({
            code: "UNAUTHORIZED",
            message: "Incorrect credentials. Use password '123456' for test accounts."
          });
        }
        const passwordHash = hashPassword(password);
        await upsertUser({
          openId,
          name,
          email,
          role,
          loginMethod: "local",
          passwordHash,
          lastSignedIn: /* @__PURE__ */ new Date()
        });
        const created = await getUserByEmail(email);
        if (created) {
          userId = created.id;
        }
      }
      const token = await sdk.signSession({
        openId,
        appId: "citycare",
        name,
        email,
        role
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS
      });
      const loggedInUser = {
        id: userId,
        openId,
        name,
        email,
        role,
        loginMethod: "local",
        lastSignedIn: /* @__PURE__ */ new Date(),
        createdAt: dbUser?.createdAt || /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      return {
        success: true,
        token,
        user: loggedInUser
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  departments: departmentsRouter,
  issues: issuesRouter,
  notifications: notificationsRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// api/index.ts
var app = express();
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
app.get("/api/health", async (_req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        status: "degraded",
        server: true,
        database: false
      });
    }
    await db.select({ value: count2() }).from(departments);
    return res.status(200).json({
      status: "ok",
      server: true,
      database: true
    });
  } catch (error) {
    console.error("[Health Check Error]:", error);
    return res.status(503).json({
      status: "degraded",
      server: true,
      database: false
    });
  }
});
app.use((req, _res, next) => {
  if (req.url.startsWith("/trpc")) {
    req.url = `/api${req.url}`;
  }
  next();
});
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`[tRPC Serverless Error on path '${path}']:`, error);
    }
  })
);
app.use((err, _req, res, _next) => {
  console.error("[Serverless Unhandled Error]:", err);
  res.status(500).json({
    error: err?.message || "Internal Server Error"
  });
});
var index_default = app;
export {
  index_default as default
};
