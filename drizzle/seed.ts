import "dotenv/config";
import { eq } from "drizzle-orm";
import { departments, issues, issueStatusHistory, users } from "./schema";
import { defaultDepartments } from "../server/routers/issues";
import { getDb } from "../server/db";
import { hashPassword } from "../server/_core/authUtils";

const demoUsers = [
  {
    openId: "admin-01",
    name: "Operations Administrator",
    email: "admin@gmail.com",
    role: "admin" as const,
    loginMethod: "local",
    password: "123456",
  },
  {
    openId: "user-01",
    name: "Citizen User",
    email: "user@gmail.com",
    role: "user" as const,
    loginMethod: "local",
    password: "123456",
  },
];

const samples = [
  { code: "CC-2026-000101", categorySlug: "pothole", title: "Large pothole near Miyapur junction", description: "A deep pothole is affecting the left lane and is difficult to see after dark.", status: "in_progress" as const, priority: "high" as const, latitude: 17.4968, longitude: 78.3565, address: "Miyapur Main Road, Hyderabad", upvoteCount: 82, departmentSlug: "roads-transport" },
  { code: "CC-2026-000102", categorySlug: "drainage", title: "Drainage blockage on Hafeezpet main road", description: "Water is collecting near the bus stop after light rain.", status: "submitted" as const, priority: "urgent" as const, latitude: 17.4941, longitude: 78.3621, address: "Hafeezpet Main Road, Hyderabad", upvoteCount: 61, departmentSlug: "water-sewage" },
  { code: "CC-2026-000103", categorySlug: "streetlight", title: "Streetlight out on 3rd Avenue", description: "The streetlight has not been working for two evenings.", status: "acknowledged" as const, priority: "medium" as const, latitude: 17.5002, longitude: 78.3511, address: "3rd Avenue, Miyapur, Hyderabad", upvoteCount: 28, departmentSlug: "electricity-streetlights" },
  { code: "CC-2026-000104", categorySlug: "garbage", title: "Overflowing community bins", description: "The collection point is overflowing and needs a pickup.", status: "resolved" as const, priority: "low" as const, latitude: 17.4892, longitude: 78.3584, address: "Madinaguda Circle, Hyderabad", upvoteCount: 19, departmentSlug: "sanitation" },
  { code: "CC-2026-000105", categorySlug: "water_leak", title: "Water leak beside the park entrance", description: "Fresh water is pooling near the footpath.", status: "reopened" as const, priority: "high" as const, latitude: 17.5032, longitude: 78.3691, address: "Miyapur Park Road, Hyderabad", upvoteCount: 34, departmentSlug: "water-sewage" },
  { code: "CC-2026-000106", categorySlug: "tree_hazard", title: "Low branch blocking footpath", description: "A low branch is blocking the accessible path.", status: "submitted" as const, priority: "medium" as const, latitude: 17.4924, longitude: 78.3477, address: "Miyapur Lake Road, Hyderabad", upvoteCount: 12, departmentSlug: "parks-public-spaces" },
];

async function seed() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not configured or reachable");

  console.log("[Seed] Seeding demo users with hashed passwords...");
  for (const u of demoUsers) {
    const passwordHash = hashPassword(u.password);
    await db
      .insert(users)
      .values({
        openId: u.openId,
        name: u.name,
        email: u.email,
        role: u.role,
        loginMethod: u.loginMethod,
        passwordHash,
        lastSignedIn: new Date(),
      })
      .onConflictDoUpdate({
        target: users.openId,
        set: {
          name: u.name,
          email: u.email,
          role: u.role,
          passwordHash,
          lastSignedIn: new Date(),
        },
      });
  }

  console.log("[Seed] Seeding municipal departments...");
  const departmentIds = new Map<string, number>();
  for (const department of defaultDepartments) {
    const existing = await db.select().from(departments).where(eq(departments.slug, department.slug)).limit(1);
    if (existing[0]) {
      departmentIds.set(department.slug, existing[0].id);
      continue;
    }
    const inserted = await db.insert(departments).values(department).returning({ id: departments.id });
    if (inserted[0]?.id) departmentIds.set(department.slug, inserted[0].id);
  }

  console.log("[Seed] Seeding sample civic issues...");
  for (const sample of samples) {
    const existing = await db.select({ id: issues.id }).from(issues).where(eq(issues.referenceCode, sample.code)).limit(1);
    if (existing[0]) continue;
    const inserted = await db.insert(issues).values({
      referenceCode: sample.code,
      reporterId: null,
      isAnonymous: true,
      categorySlug: sample.categorySlug,
      departmentId: departmentIds.get(sample.departmentSlug) ?? null,
      title: sample.title,
      description: sample.description,
      status: sample.status,
      priority: sample.priority,
      latitude: sample.latitude,
      longitude: sample.longitude,
      address: sample.address,
      upvoteCount: sample.upvoteCount,
      resolvedAt: sample.status === "resolved" ? new Date() : null,
    }).returning({ id: issues.id });

    if (inserted[0]?.id) {
      await db.insert(issueStatusHistory).values({
        issueId: inserted[0].id,
        fromStatus: null,
        toStatus: sample.status,
        note: "Seeded CityCare demo record",
      });
    }
  }

  console.log(`Successfully seeded ${demoUsers.length} users, ${defaultDepartments.length} departments, and ${samples.length} sample issues.`);
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed error:", error);
  process.exit(1);
});
