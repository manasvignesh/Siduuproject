import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
  email?: string | null;
  role?: "user" | "admin";
};

export type AuthenticatedUser = User;

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret || "citycare_super_secret_jwt_key_2026";
    return new TextEncoder().encode(secret);
  }

  /**
   * Sign a JWT session token
   */
  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId || "citycare",
      name: payload.name || "CityCare User",
      email: payload.email || "",
      role: payload.role || "user",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string; email?: string; role?: "user" | "admin" } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId || "citycare",
        name: options.name || "",
        email: options.email || "",
        role: options.role || "user",
      },
      options
    );
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionPayload | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name, email, role } = payload as Record<string, unknown>;

      if (typeof openId !== "string" || !openId) {
        return null;
      }

      return {
        openId,
        appId: (typeof appId === "string" ? appId : "citycare"),
        name: (typeof name === "string" ? name : "User"),
        email: (typeof email === "string" ? email : null),
        role: (role === "admin" ? "admin" : "user"),
      };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    // 1. Check session cookie
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    // 2. Fallback to Authorization header Bearer token
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

    const signedInAt = new Date();
    let user = await db.getUserByOpenId(session.openId);

    if (!user) {
      // Upsert in database if DB is available
      try {
        await db.upsertUser({
          openId: session.openId,
          name: session.name || null,
          email: session.email ?? null,
          loginMethod: "local",
          role: session.role || "user",
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(session.openId);
      } catch (e) {
        console.warn("[Auth] Failed to upsert user in DB:", e);
      }
    }

    if (!user) {
      // Return structured fallback user from session payload
      return {
        id: session.openId === "admin-01" ? 1 : 2,
        openId: session.openId,
        name: session.name || (session.role === "admin" ? "Operations Administrator" : "Citizen User"),
        email: session.email || (session.role === "admin" ? "admin@gmail.com" : "user@gmail.com"),
        loginMethod: "local",
        role: session.role || "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: signedInAt,
      } as AuthenticatedUser;
    }

    return user;
  }
}

export const sdk = new SDKServer();
