import { and, asc, count, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { departments, issueComments, issuePhotos, issueStatusHistory, issueUpvotes, issues, notifications, users } from "../../drizzle/schema";
import { makeRequest, type GeocodingResult } from "../_core/map";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { mockDb, type MockIssue } from "../mockDb";

const categorySlug = z.enum(["pothole", "garbage", "streetlight", "water_leak", "graffiti", "stray_animal", "tree_hazard", "drainage", "illegal_dumping", "other"]);
const issueStatus = z.enum(["submitted", "acknowledged", "in_progress", "resolved", "rejected", "reopened", "closed"]);
const priority = z.enum(["low", "medium", "high", "urgent"]);
const verification = z.enum(["accepted", "rejected"]);

export const defaultDepartments = [
  { name: "Roads & Transport", slug: "roads-transport" },
  { name: "Sanitation", slug: "sanitation" },
  { name: "Water & Sewage", slug: "water-sewage" },
  { name: "Electricity & Streetlights", slug: "electricity-streetlights" },
  { name: "Parks & Public Spaces", slug: "parks-public-spaces" },
  { name: "Other", slug: "other" },
] as const;

const createIssueInput = z.object({
  title: z.string().trim().min(4).max(200),
  description: z.string().trim().min(4).max(5000),
  categorySlug,
  lat: z.number().finite().gte(-90).lte(90),
  lng: z.number().finite().gte(-180).lte(180),
  photoUrls: z.array(z.string()).max(3).default([]),
  isAnonymous: z.boolean().default(false),
  priority: priority.default("medium"),
  address: z.string().trim().max(500).nullable().optional(),
});

function departmentFor(category: string) {
  if (["pothole", "graffiti"].includes(category)) return "roads-transport";
  if (["garbage", "illegal_dumping", "drainage"].includes(category)) return "sanitation";
  if (["water_leak"].includes(category)) return "water-sewage";
  if (["streetlight", "electricity"].includes(category)) return "electricity-streetlights";
  if (["tree_hazard", "stray_animal"].includes(category)) return "parks-public-spaces";
  return "other";
}

export function referenceCode(year: number, id: number) {
  return `CC-${year}-${String(id).padStart(6, "0")}`;
}

export function withinDuplicateRadius(lat: number, lng: number, candidateLat: number, candidateLng: number) {
  const latMeters = (lat - candidateLat) * 111_000;
  const lngMeters = (lng - candidateLng) * 111_000 * Math.cos((lat * Math.PI) / 180);
  return Math.sqrt(latMeters ** 2 + lngMeters ** 2) <= 75;
}

async function bestEffortAddress(lat: number, lng: number) {
  try {
    const result = await makeRequest<GeocodingResult>("/maps/api/geocode/json", { latlng: `${lat},${lng}` });
    return result.results?.[0]?.formatted_address ?? null;
  } catch {
    return null;
  }
}

export const issuesRouter = router({
  nearbyDuplicates: protectedProcedure.input(z.object({ categorySlug, lat: z.number(), lng: z.number(), radiusMeters: z.number().positive().max(500).default(75) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      const all = mockDb.getIssues();
      return all
        .filter(i => i.categorySlug === input.categorySlug && !["resolved", "rejected"].includes(i.status))
        .filter(i => withinDuplicateRadius(input.lat, input.lng, i.latitude, i.longitude))
        .sort((a, b) => b.upvoteCount - a.upvoteCount);
    }
    const delta = input.radiusMeters / 111_000;
    const candidates = await db.select({ id: issues.id, referenceCode: issues.referenceCode, title: issues.title, status: issues.status, latitude: issues.latitude, longitude: issues.longitude, upvoteCount: issues.upvoteCount, address: issues.address }).from(issues).where(and(eq(issues.categorySlug, input.categorySlug), ne(issues.status, "resolved"), ne(issues.status, "rejected"), gte(issues.latitude, input.lat - delta), lte(issues.latitude, input.lat + delta), gte(issues.longitude, input.lng - delta), lte(issues.longitude, input.lng + delta))).limit(20);
    return candidates.filter(item => withinDuplicateRadius(input.lat, input.lng, item.latitude, item.longitude)).sort((a, b) => b.upvoteCount - a.upvoteCount);
  }),

  list: publicProcedure.input(z.object({
    statuses: z.array(issueStatus).optional(),
    categories: z.array(categorySlug).optional(),
    departmentId: z.number().int().positive().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    radiusKm: z.number().positive().max(50).default(10),
    sort: z.enum(["newest", "most_upvoted", "priority"]).default("newest"),
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0),
  }).default({ radiusKm: 10, sort: "newest", limit: 50, offset: 0 })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      let items = [...mockDb.getIssues()];
      if (input.statuses?.length) {
        items = items.filter(i => input.statuses!.includes(i.status));
      }
      if (input.categories?.length) {
        items = items.filter(i => input.categories!.includes(i.categorySlug as any));
      }
      if (input.departmentId) {
        items = items.filter(i => i.departmentId === input.departmentId);
      }
      if (input.sort === "most_upvoted") {
        items.sort((a, b) => b.upvoteCount - a.upvoteCount);
      } else if (input.sort === "priority") {
        const pOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        items.sort((a, b) => (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0));
      } else {
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      const paginated = items.slice(input.offset, input.offset + input.limit);
      return { items: paginated, total: items.length, offset: input.offset, limit: input.limit };
    }
    const filters = [];
    if (input.statuses?.length) filters.push(inArray(issues.status, input.statuses));
    if (input.categories?.length) filters.push(inArray(issues.categorySlug, input.categories));
    if (input.departmentId) filters.push(eq(issues.departmentId, input.departmentId));
    if (input.lat !== undefined && input.lng !== undefined) {
      const delta = input.radiusKm / 111;
      filters.push(gte(issues.latitude, input.lat - delta), lte(issues.latitude, input.lat + delta), gte(issues.longitude, input.lng - delta), lte(issues.longitude, input.lng + delta));
    }
    const where = filters.length ? and(...filters) : undefined;
    const orderBy = input.sort === "most_upvoted" ? desc(issues.upvoteCount) : input.sort === "priority" ? desc(sql`FIELD(${issues.priority}, 'urgent', 'high', 'medium', 'low')`) : desc(issues.createdAt);
    const [items, totalRows] = await Promise.all([
      db.select().from(issues).where(where).orderBy(orderBy).limit(input.limit).offset(input.offset),
      db.select({ value: count() }).from(issues).where(where),
    ]);
    return { items, total: totalRows[0]?.value ?? 0, offset: input.offset, limit: input.limit };
  }),

  getById: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      const issue = mockDb.getIssueById(input.id);
      if (!issue) return null;
      const photos = mockDb.getPhotos(input.id);
      const history = mockDb.getHistory(input.id);
      const comments = mockDb.getComments(input.id);
      const department = mockDb.getDepartment(issue.departmentId);
      const reporter = { id: issue.reporterId ?? 1, name: "Community Member" };
      const hasUpvoted = mockDb.hasUserUpvoted(input.id, ctx.user?.id ?? 1);
      return { issue, photos, history, comments, department, reporter, hasUpvoted };
    }
    const issue = (await db.select().from(issues).where(eq(issues.id, input.id)).limit(1))[0];
    if (!issue) return null;
    const [photos, history, comments, department, reporter] = await Promise.all([
      db.select().from(issuePhotos).where(eq(issuePhotos.issueId, input.id)).orderBy(asc(issuePhotos.createdAt)),
      db.select().from(issueStatusHistory).where(eq(issueStatusHistory.issueId, input.id)).orderBy(asc(issueStatusHistory.createdAt)),
      db.select().from(issueComments).where(and(eq(issueComments.issueId, input.id), ctx.user?.role === "admin" ? undefined : eq(issueComments.isInternal, false))).orderBy(asc(issueComments.createdAt)),
      issue.departmentId ? db.select().from(departments).where(eq(departments.id, issue.departmentId)).limit(1) : Promise.resolve([]),
      issue.reporterId ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, issue.reporterId)).limit(1) : Promise.resolve([]),
    ]);
    const upvote = ctx.user ? await db.select({ id: issueUpvotes.id }).from(issueUpvotes).where(and(eq(issueUpvotes.issueId, input.id), eq(issueUpvotes.userId, ctx.user.id))).limit(1) : [];
    return { issue, photos, history, comments, department: department[0] ?? null, reporter: reporter[0] ?? null, hasUpvoted: upvote.length > 0 };
  }),

  create: protectedProcedure.input(createIssueInput).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      const all = mockDb.getIssues();
      const duplicate = all
        .filter(i => i.categorySlug === input.categorySlug && !["resolved", "rejected"].includes(i.status))
        .find(i => withinDuplicateRadius(input.lat, input.lng, i.latitude, i.longitude));
      if (duplicate) return { possibleDuplicate: true as const, existingIssue: duplicate };

      const deptSlug = departmentFor(input.categorySlug);
      const dept = mockDb.departments.find(d => d.slug === deptSlug);
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
        photoUrls: input.photoUrls,
      });
      return { possibleDuplicate: false as const, issueId: created.id, referenceCode: created.referenceCode };
    }
    const delta = 75 / 111_000;
    const recent = await db.select({ id: issues.id, referenceCode: issues.referenceCode, title: issues.title, status: issues.status, latitude: issues.latitude, longitude: issues.longitude, upvoteCount: issues.upvoteCount }).from(issues).where(and(eq(issues.categorySlug, input.categorySlug), ne(issues.status, "resolved"), ne(issues.status, "rejected"), gte(issues.latitude, input.lat - delta), lte(issues.latitude, input.lat + delta), gte(issues.longitude, input.lng - delta), lte(issues.longitude, input.lng + delta))).limit(20);
    const duplicate = recent.find((item) => withinDuplicateRadius(input.lat, input.lng, item.latitude, item.longitude));
    if (duplicate) return { possibleDuplicate: true as const, existingIssue: duplicate };
    const address = input.address ?? await bestEffortAddress(input.lat, input.lng);
    const department = (await db.select().from(departments).where(eq(departments.slug, departmentFor(input.categorySlug))).limit(1))[0];
    const slaHours = input.priority === "urgent" ? 24 : input.priority === "high" ? 72 : input.priority === "medium" ? 120 : 168;
    const inserted = await db.insert(issues).values({ referenceCode: "PENDING", reporterId: ctx.user.id, isAnonymous: input.isAnonymous, categorySlug: input.categorySlug, departmentId: department?.id ?? null, title: input.title, description: input.description, priority: input.priority, latitude: input.lat, longitude: input.lng, address, slaDeadline: new Date(Date.now() + slaHours * 60 * 60 * 1000) }).$returningId();
    const issueId = inserted[0]?.id;
    if (!issueId) throw new Error("Issue creation failed");
    const code = referenceCode(new Date().getFullYear(), issueId);
    await db.update(issues).set({ referenceCode: code }).where(eq(issues.id, issueId));
    await db.insert(issueStatusHistory).values({ issueId, fromStatus: null, toStatus: "submitted", changedById: ctx.user.id, note: "Report received from citizen" });
    if (input.photoUrls.length) await db.insert(issuePhotos).values(input.photoUrls.map((url) => ({ issueId, url, kind: "before" as const })));
    await db.insert(notifications).values({ userId: ctx.user.id, issueId, title: "We received your report", body: `Your civic issue ${code} is now submitted.` });
    return { possibleDuplicate: false as const, issueId, referenceCode: code };
  }),

  uploadPhoto: protectedProcedure.input(z.object({ filename: z.string().regex(/\.(png|jpe?g|webp)$/i), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), dataBase64: z.string().max(8_000_000) })).mutation(async ({ input, ctx }) => {
    const buffer = Buffer.from(input.dataBase64, "base64");
    if (buffer.length > 6 * 1024 * 1024) throw new Error("Image must be 6 MB or smaller");
    const uploaded = await storagePut(`citycare/${ctx.user.id}/${input.filename}`, buffer, input.contentType);
    return uploaded;
  }),

  verifyResolution: protectedProcedure.input(z.object({ issueId: z.number().int().positive(), result: verification, note: z.string().trim().max(2000).optional() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      const nextStatus = mockDb.verifyResolution({ issueId: input.issueId, result: input.result, changedById: ctx.user.id, note: input.note });
      if (!nextStatus) throw new Error("Issue not found");
      return { success: true as const, status: nextStatus };
    }
    const issue = (await db.select().from(issues).where(and(eq(issues.id, input.issueId), eq(issues.reporterId, ctx.user.id))).limit(1))[0];
    if (!issue) throw new Error("Issue not found");
    const nextStatus = input.result === "accepted" ? "closed" : "reopened";
    await db.update(issues).set({ citizenVerification: input.result, verificationNote: input.note ?? null, status: nextStatus, closedAt: input.result === "accepted" ? new Date() : null }).where(eq(issues.id, input.issueId));
    await db.insert(issueStatusHistory).values({ issueId: input.issueId, fromStatus: issue.status, toStatus: nextStatus, changedById: ctx.user.id, note: input.note });
    if (issue.departmentId) {
      const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
      if (admins.length) await db.insert(notifications).values(admins.map(admin => ({ userId: admin.id, issueId: input.issueId, title: input.result === "accepted" ? "Citizen confirmed the resolution" : "Citizen reopened an issue", body: `${issue.referenceCode} was marked ${nextStatus}.` })));
    }
    return { success: true as const, status: nextStatus };
  }),

  myReports: protectedProcedure.input(z.object({ status: issueStatus.optional(), limit: z.number().int().min(1).max(50).default(25) }).default({ limit: 25 })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      const myIssues = mockDb.getIssues().filter(i => i.reporterId === ctx.user.id || i.reporterId === 1);
      if (input.status) {
        return myIssues.filter(i => i.status === input.status).slice(0, input.limit);
      }
      return myIssues.slice(0, input.limit);
    }
    return db.select().from(issues).where(input.status ? and(eq(issues.reporterId, ctx.user.id), eq(issues.status, input.status)) : eq(issues.reporterId, ctx.user.id)).orderBy(desc(issues.createdAt)).limit(input.limit);
  }),

  upvote: protectedProcedure.input(z.object({ issueId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      const confirmed = mockDb.toggleUpvote(input.issueId, ctx.user.id);
      return { confirmed };
    }
    const existing = await db.select({ id: issueUpvotes.id }).from(issueUpvotes).where(and(eq(issueUpvotes.issueId, input.issueId), eq(issueUpvotes.userId, ctx.user.id))).limit(1);
    if (existing.length) {
      await db.delete(issueUpvotes).where(eq(issueUpvotes.id, existing[0].id));
      await db.update(issues).set({ upvoteCount: sql`GREATEST(${issues.upvoteCount} - 1, 0)` }).where(eq(issues.id, input.issueId));
      return { confirmed: false };
    }
    await db.insert(issueUpvotes).values({ issueId: input.issueId, userId: ctx.user.id });
    await db.update(issues).set({ upvoteCount: sql`${issues.upvoteCount} + 1` }).where(eq(issues.id, input.issueId));
    return { confirmed: true };
  }),

  addComment: protectedProcedure.input(z.object({ issueId: z.number().int().positive(), body: z.string().trim().min(1).max(2000), isInternal: z.boolean().default(false) })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      mockDb.comments.push({
        id: Date.now(),
        issueId: input.issueId,
        authorId: ctx.user.id,
        body: input.body,
        isInternal: ctx.user.role === "admin" ? input.isInternal : false,
        createdAt: new Date(),
      });
      return { id: Date.now() };
    }
    const result = await db.insert(issueComments).values({ issueId: input.issueId, authorId: ctx.user.id, body: input.body, isInternal: ctx.user.role === "admin" ? input.isInternal : false });
    return { id: Number(result[0]?.insertId ?? 0) };
  }),

  updateStatus: adminProcedure.input(z.object({ issueId: z.number().int().positive(), status: issueStatus, note: z.string().trim().max(2000).optional(), departmentId: z.number().int().positive().optional(), afterPhotoUrl: z.string().optional() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      if (input.status === "resolved" && !input.afterPhotoUrl) {
        const photos = mockDb.getPhotos(input.issueId);
        if (!photos.some(p => p.kind === "after")) {
          throw new Error("An after photo is required before resolving an issue");
        }
      }
      mockDb.updateIssueStatus({
        issueId: input.issueId,
        status: input.status,
        changedById: ctx.user.id,
        note: input.note,
        departmentId: input.departmentId,
        afterPhotoUrl: input.afterPhotoUrl,
      });
      return { success: true as const };
    }
    const existing = (await db.select().from(issues).where(eq(issues.id, input.issueId)).limit(1))[0];
    if (!existing) throw new Error("Issue not found");
    if (input.status === "resolved" && !input.afterPhotoUrl) {
      const after = await db.select({ id: issuePhotos.id }).from(issuePhotos).where(and(eq(issuePhotos.issueId, input.issueId), eq(issuePhotos.kind, "after"))).limit(1);
      if (!after.length) throw new Error("An after photo is required before resolving an issue");
    }
    if (input.afterPhotoUrl) await db.insert(issuePhotos).values({ issueId: input.issueId, url: input.afterPhotoUrl, kind: "after" });
    await db.update(issues).set({ status: input.status, departmentId: input.departmentId ?? existing.departmentId, resolvedAt: input.status === "resolved" ? new Date() : null }).where(eq(issues.id, input.issueId));
    await db.insert(issueStatusHistory).values({ issueId: input.issueId, fromStatus: existing.status, toStatus: input.status, changedById: ctx.user.id, note: input.note });
    if (existing.reporterId) await db.insert(notifications).values({ userId: existing.reporterId, issueId: input.issueId, title: "Your issue has been updated", body: `Your issue ${existing.referenceCode} is now ${input.status.replaceAll("_", " ")}.` });
    return { success: true as const };
  }),

  assignDepartment: adminProcedure.input(z.object({ issueId: z.number().int().positive(), departmentId: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      const issue = mockDb.getIssueById(input.issueId);
      if (issue) issue.departmentId = input.departmentId;
      return { success: true as const };
    }
    await db.update(issues).set({ departmentId: input.departmentId }).where(eq(issues.id, input.issueId));
    return { success: true as const };
  }),

  setPriority: adminProcedure.input(z.object({ issueId: z.number().int().positive(), priority })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      const issue = mockDb.getIssueById(input.issueId);
      if (issue) issue.priority = input.priority;
      return { success: true as const };
    }
    await db.update(issues).set({ priority: input.priority }).where(eq(issues.id, input.issueId));
    return { success: true as const };
  }),

  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return mockDb.getStats();
    }
    const [byStatus, byCategory, total] = await Promise.all([
      db.select({ status: issues.status, count: count() }).from(issues).groupBy(issues.status),
      db.select({ category: issues.categorySlug, count: count() }).from(issues).groupBy(issues.categorySlug).orderBy(desc(count())),
      db.select({ value: count() }).from(issues),
    ]);
    return { byStatus, byCategory, total: total[0]?.value ?? 0 };
  }),
});

