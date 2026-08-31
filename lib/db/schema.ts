import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  title: text("title").default("").notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("account_userId_idx").on(table.userId),
    uniqueIndex("account_issuer_accountId_uidx").on(table.issuer, table.accountId),
  ],
);

export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const companies = sqliteTable(
  "companies",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    website: text("website").notNull().default(""),
    logo: text("logo").notNull(),
    color: text("color").notNull(),
    location: text("location").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("companies_userId_idx").on(table.userId)],
);

export const resumes = sqliteTable(
  "resumes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    fileName: text("file_name").notNull(),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull().default("application/octet-stream"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("resumes_userId_idx").on(table.userId)],
);

export const coverLetters = sqliteTable(
  "cover_letters",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["text", "file"] }).notNull(),
    body: text("body"),
    fileName: text("file_name"),
    objectKey: text("object_key"),
    contentType: text("content_type"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("cover_letters_userId_idx").on(table.userId)],
);

export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    source: text("source").notNull(),
    companyWebsite: text("company_website").notNull().default(""),
    jobType: text("job_type").notNull(),
    location: text("location").notNull().default(""),
    workMode: text("work_mode").notNull(),
    stage: text("stage").notNull(),
    priority: text("priority").notNull(),
    replyStatus: text("reply_status").notNull(),
    appliedDate: text("applied_date").notNull().default(""),
    nextStepDate: text("next_step_date").notNull().default(""),
    nextStepLabel: text("next_step_label").notNull().default(""),
    reminderTime: text("reminder_time").notNull().default("None"),
    compensationMin: text("compensation_min").notNull().default(""),
    compensationMax: text("compensation_max").notNull().default(""),
    currency: text("currency").notNull().default("USD"),
    equityBonus: text("equity_bonus").notNull().default(""),
    jobUrl: text("job_url").notNull().default(""),
    jobDescription: text("job_description").notNull().default(""),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "restrict" }),
    coverLetterId: text("cover_letter_id").references(() => coverLetters.id, {
      onDelete: "set null",
    }),
    message: text("message").notNull().default(""),
    notes: text("notes").notNull().default(""),
    contactName: text("contact_name").notNull().default(""),
    contactRole: text("contact_role").notNull().default(""),
    contactEmail: text("contact_email").notNull().default(""),
    contactPhone: text("contact_phone").notNull().default(""),
    contactUrl: text("contact_url").notNull().default(""),
    contactNotes: text("contact_notes").notNull().default(""),
    tags: text("tags").notNull().default("[]"),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("applications_userId_idx").on(table.userId),
    index("applications_user_archived_idx").on(table.userId, table.archived),
    index("applications_companyId_idx").on(table.companyId),
  ],
);

export const savedViews = sqliteTable(
  "saved_views",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    query: text("query").notNull().default(""),
    stage: text("stage").notNull().default("All"),
    sort: text("sort").notNull().default("recent"),
    priorities: text("priorities").notNull().default("[]"),
    replyStatuses: text("reply_statuses").notNull().default("[]"),
    workModes: text("work_modes").notNull().default("[]"),
    sources: text("sources").notNull().default("[]"),
    year: text("year").notNull().default("all"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("saved_views_userId_idx").on(table.userId)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  companies: many(companies),
  resumes: many(resumes),
  coverLetters: many(coverLetters),
  applications: many(applications),
  savedViews: many(savedViews),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  user: one(user, { fields: [companies.userId], references: [user.id] }),
  applications: many(applications),
}));

export const resumesRelations = relations(resumes, ({ one, many }) => ({
  user: one(user, { fields: [resumes.userId], references: [user.id] }),
  applications: many(applications),
}));

export const coverLettersRelations = relations(coverLetters, ({ one, many }) => ({
  user: one(user, { fields: [coverLetters.userId], references: [user.id] }),
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(user, { fields: [applications.userId], references: [user.id] }),
  company: one(companies, { fields: [applications.companyId], references: [companies.id] }),
  resume: one(resumes, { fields: [applications.resumeId], references: [resumes.id] }),
  coverLetter: one(coverLetters, {
    fields: [applications.coverLetterId],
    references: [coverLetters.id],
  }),
}));

export const savedViewsRelations = relations(savedViews, ({ one }) => ({
  user: one(user, { fields: [savedViews.userId], references: [user.id] }),
}));
