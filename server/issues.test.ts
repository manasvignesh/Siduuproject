import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { referenceCode, withinDuplicateRadius } from "./routers/issues";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "user" | "admin"): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: role === "admin" ? 2 : 1,
      openId: `${role}-test`,
      email: `${role}@example.com`,
      name: role === "admin" ? "Test Admin" : "Test Citizen",
      loginMethod: "test",
      role,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("CityCare issue rules", () => {
  it("creates stable human-friendly reference codes", () => {
    expect(referenceCode(2026, 123)).toBe("CC-2026-000123");
  });

  it("flags issues within the civic duplicate radius", () => {
    expect(withinDuplicateRadius(17.4968, 78.3565, 17.4971, 78.3567)).toBe(true);
    expect(withinDuplicateRadius(17.4968, 78.3565, 17.501, 78.3565)).toBe(false);
  });

  it("blocks non-admins from operations procedures", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.issues.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an admin through the operations guard when the database is unavailable", async () => {
    const caller = appRouter.createCaller(contextFor("admin"));
    await expect(caller.issues.stats()).resolves.toEqual(expect.objectContaining({ byStatus: expect.any(Array), byCategory: expect.any(Array), total: expect.any(Number) }));
  });
});
