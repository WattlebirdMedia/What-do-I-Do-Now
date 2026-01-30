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
  // // PAYMENTS SERVICE
// ==========================

import { nanoid } from "nanoid";
import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, payments } from "@/db/schema";

// ==========================
// EMAIL CONFIG
// ==========================

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, // sender gmail
    pass: process.env.EMAIL_PASS, // gmail app password
  },
});

async function sendPayIdNotificationEmail(params: {
  reference: string;
  userEmail: string;
  subscriptionPlan: "monthly" | "yearly";
}) {
  const { reference, userEmail, subscriptionPlan } = params;

  await transporter.sendMail({
    from: `"Wattlebird App" <${process.env.EMAIL_USER}>`,
    to: "wattlebirdmedia@gmail.com",
    subject: "New PayID Payment – Verification Required",
    html: `
      <h2>PayID Payment Submitted</h2>
      <p><strong>User Email:</strong> ${userEmail}</p>
      <p><strong>Reference:</strong> ${reference}</p>
      <p><strong>Plan:</strong> ${subscriptionPlan}</p>
      <p>Please verify this payment to unlock access.</p>
    `,
  });
}

// ==========================
// PAYMENT LOGIC
// ==========================

export const paymentService = {
  // ----------------------------------
  // Get or create PayID reference
  // ----------------------------------
  async getOrCreatePayIdReference(userId: string) {
    const existing = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .limit(1)
      .execute();

    if (existing[0]?.payIdReference) {
      return existing[0].payIdReference;
    }

    const reference = `WDID-${nanoid(8).toUpperCase()}`;

    await db.insert(payments).values({
      userId,
      payIdReference: reference,
      paymentPending: false,
      paymentConfirmed: false,
      subscriptionPlan: "monthly",
    }).execute();

    return reference;
  },

  // ----------------------------------
  // Mark payment as pending + email admin
  // ----------------------------------
  async markPaymentPending(
    userId: string,
    subscriptionPlan: "monthly" | "yearly"
  ) {
    const user = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .execute();

    if (!user[0]) {
      throw new Error("User not found");
    }

    const reference = await this.getOrCreatePayIdReference(userId);

    await db
      .update(payments)
      .set({
        paymentPending: true,
        paymentConfirmed: false,
        subscriptionPlan,
      })
      .where(eq(payments.userId, userId))
      .execute();

    await sendPayIdNotificationEmail({
      reference,
      userEmail: user[0].email,
      subscriptionPlan,
    });

    return reference;
  },

  // ----------------------------------
  // Admin confirms payment (UNLOCK ACCESS)
  // ----------------------------------
  async confirmPayment(userId: string) {
    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({
          paymentPending: false,
          paymentConfirmed: true,
        })
        .where(eq(payments.userId, userId));

      await tx
        .update(users)
        .set({
          hasPaid: true,
        })
        .where(eq(users.id, userId));
    });
  },

  // ----------------------------------
  // Get all pending payments (admin view)
  // ----------------------------------
  async getPendingPayments() {
    return await db
      .select({
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        hasPaid: users.hasPaid,
        payIdReference: payments.payIdReference,
        subscriptionPlan: payments.subscriptionPlan,
        paymentPending: payments.paymentPending,
      })
      .from(payments)
      .innerJoin(users, eq(users.id, payments.userId))
      .where(eq(payments.paymentPending, true))
      .execute();
  },

  // ----------------------------------
  // Access guard helper
  // ----------------------------------
  requirePaidAccess(user: { hasPaid: boolean }) {
    if (!user.hasPaid) {
      throw new Error("Payment required to access this feature");
    }
  },
};

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