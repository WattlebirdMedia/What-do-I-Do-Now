import { pgTable, serial, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { InferModel } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id", { length: 21 }).primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  isAdmin: boolean("is_admin").default(false),
  hasPaid: boolean("has_paid").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 21 }).primaryKey(),
  userId: varchar("user_id", { length: 21 }).notNull(),
  text: text("text").notNull(),
  position: serial("position"),
  completedAt: timestamp("completed_at"),
  archivedAt: timestamp("archived_at"),
});

export const payments = pgTable("payments", {
  userId: varchar("user_id", { length: 21 }).primaryKey(),
  payIdReference: varchar("payid_reference", { length: 20 }),
  paymentPending: boolean("payment_pending").default(false),
  subscriptionPlan: varchar("subscription_plan", { length: 20 }),
});

// Users
export type User = InferModel<typeof users>;
export type NewUser = InferModel<typeof users, "insert">;

// Tasks
export type Task = InferModel<typeof tasks>;
export type NewTask = InferModel<typeof tasks, "insert">;

// Payments
export type Payment = InferModel<typeof payments>;
export type NewPayment = InferModel<typeof payments, "insert">;
