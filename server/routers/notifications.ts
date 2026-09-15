import { and, desc, eq } from "drizzle-orm";
import { notifications } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { z } from "zod";

export const notificationsRouter = router({
  list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(50).default(20), unreadOnly: z.boolean().default(false) }).default({ limit: 20, unreadOnly: false })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(notifications).where(input.unreadOnly ? and(eq(notifications.userId, ctx.user.id), eq(notifications.read, false)) : eq(notifications.userId, ctx.user.id)).orderBy(desc(notifications.createdAt)).limit(input.limit);
  }),
  markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database is not configured");
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, input.notificationId));
    return { success: true as const };
  }),
});
