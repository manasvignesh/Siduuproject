import {
  boolean,
  double,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const issues = mysqlTable("issues", {
  id: int("id").autoincrement().primaryKey(),
  referenceCode: varchar("referenceCode", { length: 32 }).notNull().unique(),
  reporterId: int("reporterId").references(() => users.id),
  isAnonymous: boolean("isAnonymous").default(false).notNull(),
  categorySlug: varchar("categorySlug", { length: 60 }).notNull(),
  departmentId: int("departmentId").references(() => departments.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["submitted", "acknowledged", "in_progress", "resolved", "rejected", "reopened", "closed"]).default("submitted").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  latitude: double("latitude").notNull(),
  longitude: double("longitude").notNull(),
  address: text("address"),
  upvoteCount: int("upvoteCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  slaDeadline: timestamp("slaDeadline"),
  closedAt: timestamp("closedAt"),
  citizenVerification: mysqlEnum("citizenVerification", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  verificationNote: text("verificationNote"),
}, (table) => ({
  geoIndex: index("issues_geo_idx").on(table.latitude, table.longitude),
  statusIndex: index("issues_status_idx").on(table.status),
  categoryIndex: index("issues_category_idx").on(table.categorySlug),
}));

export const issuePhotos = mysqlTable("issue_photos", {
  id: int("id").autoincrement().primaryKey(),
  issueId: int("issueId").notNull().references(() => issues.id),
  url: text("url").notNull(),
  kind: mysqlEnum("kind", ["before", "after"]).default("before").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const issueStatusHistory = mysqlTable("issue_status_history", {
  id: int("id").autoincrement().primaryKey(),
  issueId: int("issueId").notNull().references(() => issues.id),
  fromStatus: varchar("fromStatus", { length: 40 }),
  toStatus: varchar("toStatus", { length: 40 }).notNull(),
  changedById: int("changedById").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const issueUpvotes = mysqlTable("issue_upvotes", {
  id: int("id").autoincrement().primaryKey(),
  issueId: int("issueId").notNull().references(() => issues.id),
  userId: int("userId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  issueUserUnique: uniqueIndex("issue_user_unique").on(table.issueId, table.userId),
}));

export const issueComments = mysqlTable("issue_comments", {
  id: int("id").autoincrement().primaryKey(),
  issueId: int("issueId").notNull().references(() => issues.id),
  authorId: int("authorId").notNull().references(() => users.id),
  body: text("body").notNull(),
  isInternal: boolean("isInternal").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  issueId: int("issueId").references(() => issues.id),
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
