import { int, mysqlEnum, mysqlTable, primaryKey, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Per-client, short-lived cache of completed wrap previews. Cache rows avoid
 * requesting a new OpenAI image when the same IP resubmits the exact image and
 * options within the configured TTL.
 */
export const wrapPreviewCache = mysqlTable("wrap_preview_cache", {
  cacheKey: varchar("cacheKey", { length: 64 }).primaryKey(),
  responseJson: text("responseJson").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Per-IP daily counter and active generation lease. The composite primary key
 * keeps a separate budget for every UTC calendar day without storing raw IPs.
 */
export const wrapPreviewUsage = mysqlTable(
  "wrap_preview_usage",
  {
    ipHash: varchar("ipHash", { length: 64 }).notNull(),
    usageDay: varchar("usageDay", { length: 10 }).notNull(),
    completedCount: int("completedCount").default(0).notNull(),
    activeCount: int("activeCount").default(0).notNull(),
    activeSince: timestamp("activeSince"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    primary: primaryKey({ columns: [table.ipHash, table.usageDay] }),
  }),
);

/**
 * Member-owned preview records. The image bytes live in File Storage; this table
 * keeps only storage URLs and the choices needed by the CRM audit view.
 */
export const memberPreviewHistory = mysqlTable("member_preview_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  previewUrl: text("previewUrl").notNull(),
  originalImageUrl: text("originalImageUrl"),
  vehicleModel: varchar("vehicleModel", { length: 120 }),
  vehicleModelAi: varchar("vehicleModelAi", { length: 160 }),
  vehicleModelAiConfidence: int("vehicleModelAiConfidence").default(0).notNull(),
  vehicleModelAiSource: varchar("vehicleModelAiSource", { length: 24 }).default("pending").notNull(),
  vehicleModelAiCandidatesJson: text("vehicleModelAiCandidatesJson"),
  pantoneId: varchar("pantoneId", { length: 48 }).notNull(),
  catalogColorJson: text("catalogColorJson"),
  aspectRatio: varchar("aspectRatio", { length: 20 }).notNull(),
  outputSize: varchar("outputSize", { length: 32 }),
  partialWrapCustomizations: text("partialWrapCustomizations").notNull(),
  followUpStatus: varchar("followUpStatus", { length: 32 }).default("new").notNull(),
  adminTagsJson: text("adminTagsJson"),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  retentionDays: int("retentionDays").default(3).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  isSaved: int("isSaved").default(0).notNull(),
});

export type MemberPreviewHistory = typeof memberPreviewHistory.$inferSelect;
export type InsertMemberPreviewHistory = typeof memberPreviewHistory.$inferInsert;
