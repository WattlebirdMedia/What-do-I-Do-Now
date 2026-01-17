import { db } from "./db"; // your Drizzle client
import { users, tasks, payments } from "@shared/schema";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { eq, isNull, and, not } from "drizzle-orm/sql"; // add isNull helper

const SALT_ROUNDS = 10;

export const storage = {
  // ==========================
  // USERS
  // ==========================
  async getUser(id: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .execute();
    return result[0] || null;
  },

  async getUserByEmail(email: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .execute();
    return result[0] || null;
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
    id,                     // <-- just the property names from schema
    email,
    passwordHash,
    firstName: firstName ?? null,
    lastName: lastName ?? null,
    isAdmin,
    hasPaid: false,
    createdAt,
    }).execute();

    return { id, email, firstName: firstName ?? null, lastName: lastName ?? null, isAdmin, createdAt };
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
      .where(eq(payments.userId, userId))
      .execute();

    if (existing[0]?.payIdReference) return existing[0].payIdReference;

    const reference = `WDID-${nanoid(8).toUpperCase()}`;
    await db.insert(payments).values({
    userId,                 // <-- property name from schema
    payIdReference: reference,
    paymentPending: false,
    subscriptionPlan: "monthly",
    }).execute();

    return reference;
  },

  async markPaymentPending(userId: string, reference: string, subscriptionPlan: "monthly" | "yearly") {
    await db.update(payments)
        .set({
        paymentPending: true,
        payIdReference: reference,
        subscriptionPlan,
        })
        .where(eq(payments.userId, userId))
        .execute();
    },

  async getPendingPayments() {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        hasPaid: users.hasPaid,
        payIdReference: payments.payIdReference,
        paymentPending: payments.paymentPending,
        subscriptionPlan: payments.subscriptionPlan,
      })
      .from(users)
      .leftJoin(payments, eq(users.id, payments.userId))
      .where(eq(payments.paymentPending, true))
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
          eq(tasks.userId, userId),
          isNull(tasks.archivedAt) // not archived
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
          not(isNull(tasks.completedAt)), // completed
          isNull(tasks.archivedAt)       // not archived
        )
      )
      .execute();
  },

   async createTask(data: { text: string; position: number }, userId: string) {
    const id = nanoid();

    // Match the Drizzle schema exactly: no 'completed' or 'archived', only 'completedAt' and 'archivedAt'
    const task = {
      id,
      userId,
      text: data.text,
      position: data.position,
      completedAt: null,
      archivedAt: null
    };

    await db.insert(tasks).values(task).execute();

    return task;
  },
  
  async completeTask(taskId: string, userId: string) {
    await db.update(tasks)
        .set({ completedAt: new Date() })
        .where(and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId)
        ))
        .execute();
    },

async getTaskById(taskId: string) {
    const result = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .execute();

    // Return the first result or null if not found
    return result[0] ?? null;
    },

  async reorderTasks(taskIds: string[], userId: string) {
    for (let i = 0; i < taskIds.length; i++) {
        await db.update(tasks)
        .set({ position: i }) // no need for [tasks.position], just use the column name
        .where(
            and(
            eq(tasks.id, taskIds[i]),
            eq(tasks.userId, userId)
            )
        )
        .execute();
    }},

  async getArchivedTasks(userId: string) {
    return await db
        .select()
        .from(tasks)
        .where(
        and(
            eq(tasks.userId, userId),
            not(isNull(tasks.archivedAt))
        )
        )
        .execute();
    },

  
    async archiveCompletedTasks(userId: string) {
    await db.update(tasks)
        .set({ archivedAt: new Date() })
        .where(
        and(
            eq(tasks.userId, userId),
            not(isNull(tasks.completedAt))
        )
        )
        .execute();
    },

  async restoreTask(taskId: string, userId: string) {
    await db.update(tasks)
        .set({ archivedAt: new Date() })
        .where(
        and(
            eq(tasks.id, taskId),
            eq(tasks.userId, userId)
        )
        )
        .execute();
    },

    async getTask(taskId: string) {
    const result = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .execute();

    return result[0] ?? null; // safer than || in case result[0] is falsy
    },

  async permanentlyDeleteTask(taskId: string, userId: string) {
    await db.delete(tasks)
        .where(
        and(
            eq(tasks.id, taskId),
            eq(tasks.userId, userId)
        )
        )
        .execute();
    },

  async emptyBin(userId: string) {
    await db.delete(tasks)
        .where(
        and(
            eq(tasks.userId, userId),
            not(isNull(tasks.completedAt))
        )
        )
        .execute();
    }
};