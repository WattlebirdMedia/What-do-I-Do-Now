import { eq, and } from "drizzle-orm";
import { db } from "./db"; // your drizzle client
import { users, tasks, payments } from "@shared/schema"; // adjust path if needed
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { Express } from "express";
import { setupAuth } from "./auth";

const SALT_ROUNDS = 10;

export async function registerRoutes(_server: any, app: Express) {
  // Setup auth routes
  await setupAuth(app);

  // Example extra route
  app.get("/ping", (_req, res) => {
    res.json({ pong: true });
  });
}

export const storage = {
  // ==========================
  // USERS
  // ==========================
  async getUser(id: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id)) // use eq(column, value)
      .execute();

    return result[0] ?? null;
  },

  async getUserByEmail(email: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email)) // use eq(column, value)
      .execute();

    return result[0] ?? null;
  },

  async createUser(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    isAdmin = false
  ) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = nanoid();
    const createdAt = new Date();

    await db.insert(users).values({
      id,
      email,
      passwordHash,
      firstName,
      lastName,
      isAdmin,
      createdAt,
    }).execute();

    return { id, email, firstName, lastName, isAdmin, createdAt };
  },

  async verifyPassword(email: string, password: string) {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(password, user.passwordHash);
    return match ? user : null;
  },

  // ==========================
  // PAYMENTS
  // ==========================
  
  async getOrCreatePayIdReference(userId: string) {
    const existing = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId)) // use property name
      .execute();

    if (existing[0]?.payIdReference) return existing[0].payIdReference;

    const reference = `WDID-${nanoid(8).toUpperCase()}`;

    await db
      .insert(payments)
      .values({
        userId,           // use property name
        payIdReference: reference
      })
      .execute();

    return reference;
  },

  async markPaymentPending(
    userId: string,
    reference: string,
    subscriptionPlan: "monthly" | "yearly"
  ) {
    await db
      .update(payments)
      .set({
        paymentPending: true,
        payIdReference: reference,
        subscriptionPlan
      })
      .where(eq(payments.userId, userId)) // use property name
      .execute();
  },

  async markUserAsPaid(userId: string) {
    // Mark the user as paid
    await db
      .update(users)
      .set({ hasPaid: true })
      .where(eq(users.id, userId)) // use eq()
      .execute();

    // Clear pending payment in payments table
    await db
      .update(payments)
      .set({ paymentPending: false })
      .where(eq(payments.userId, userId)) // use eq()
      .execute();
  },

  async getPendingPayments() {
    const rows = await db
      .select()
      .from(users)
      .leftJoin(payments, eq(users.id, payments.userId))
      .where(eq(payments.paymentPending, true)) // use eq() and table property
      .execute();

    return rows;
  },

  // ==========================
  // TASKS
  // ==========================
  async getTasks(userId: string) {
    return await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId), // filter by user
          eq(tasks.archived, false)  // filter by archived flag
        )
      )
      .execute();
  },

  async getCompletedTasks(userId: string) {
    return await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.completed, true),
          eq(tasks.archived, false)
        )
      )
      .execute();
  },

  async createTask(data: { text: string; position: number }, userId: string) {
    const id = nanoid();
    const task = { ...data, id, userId, completed: false, archived: false };
    await db.insert(tasks).values(task).execute();
    return task;
  },

  async completeTask(taskId: string, userId: string) {
  // Mark task as completed
    await db
      .update(tasks)
      .set({ completed: true })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.userId, userId)
        )
      )
      .execute();

    // Fetch the updated task
    const result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .execute();

    return result[0] ?? null;
  },

  async reorderTasks(taskIds: string[], userId: string) {
    for (let i = 0; i < taskIds.length; i++) {
      await db
        .update(tasks)
        .set({ position: i })
        .where(
          and(
            eq(tasks.id, taskIds[i]),
            eq(tasks.userId, userId)
          )
        )
        .execute();
    }
  },

  async getArchivedTasks(userId: string) {
    return await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.archived, true)
        )
      )
      .execute();
  },

  async archiveCompletedTasks(userId: string) {
    await db
      .update(tasks)
      .set({ archived: true })
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.completed, true)
        )
      )
      .execute();
  },

  async restoreTask(taskId: string, userId: string) {
  // Restore the task
    await db
      .update(tasks)
      .set({ archived: false })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.userId, userId)
        )
      )
      .execute();

    // Fetch the updated task
    const result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .execute();

    return result[0] ?? null;
  },

  async permanentlyDeleteTask(taskId: string, userId: string) {
    await db
      .delete(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.userId, userId)
        )
      )
      .execute();
  },

  async emptyBin(userId: string) {
    await db
      .delete(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.archived, true)
        )
      )
      .execute();
}}