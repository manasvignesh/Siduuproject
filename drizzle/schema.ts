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
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const issueStatusEnum = pgEnum("issue_status", [
  "submitted",
  "acknowledged",
  "in_progress",
  "resolved",
  "rejected",
  "reopened",
  "closed",
]);
export const issuePriorityEnum = pgEnum("issue_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
export const photoKindEnum = pgEnum("photo_kind", ["before", "after"]);
export const citizenVerificationEnum = pgEnum("citizen_verification", [
  "pending",
  "accepted",
  "rejected",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  passwordHash: text("passwordHash"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const issues = pgTable(
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
    citizenVerification: citizenVerificationEnum("citizenVerification")
      .default("pending")
      .notNull(),
    verificationNote: text("verificationNote"),
  },
  (table) => [
    index("issues_geo_idx").on(table.latitude, table.longitude),
    index("issues_status_idx").on(table.status),
    index("issues_category_idx").on(table.categorySlug),
  ]
);

export const issuePhotos = pgTable("issue_photos", {
  id: serial("id").primaryKey(),
  issueId: integer("issueId")
    .notNull()
    .references(() => issues.id),
  url: text("url").notNull(),
  kind: photoKindEnum("kind").default("before").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const issueStatusHistory = pgTable("issue_status_history", {
  id: serial("id").primaryKey(),
  issueId: integer("issueId")
    .notNull()
    .references(() => issues.id),
  fromStatus: varchar("fromStatus", { length: 40 }),
  toStatus: varchar("toStatus", { length: 40 }).notNull(),
  changedById: integer("changedById").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const issueUpvotes = pgTable(
  "issue_upvotes",
  {
    id: serial("id").primaryKey(),
    issueId: integer("issueId")
      .notNull()
      .references(() => issues.id),
    userId: integer("userId")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("issue_user_unique").on(table.issueId, table.userId),
  ]
);

export const issueComments = pgTable("issue_comments", {
  id: serial("id").primaryKey(),
  issueId: integer("issueId")
    .notNull()
    .references(() => issues.id),
  authorId: integer("authorId")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  isInternal: boolean("isInternal").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id),
  issueId: integer("issueId").references(() => issues.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type IssueStatus = Issue["status"];
export type IssuePriority = Issue["priority"];
