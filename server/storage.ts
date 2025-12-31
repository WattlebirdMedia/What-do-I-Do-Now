import { tasks, users, type Task, type InsertTask, type User } from "@shared/schema";
import { db, pool } from "./db";
import { eq, asc, and, sql } from "drizzle-orm";

export interface IStorage {
  getTasks(userId: string): Promise<Task[]>;
  getCompletedTasks(userId: string): Promise<Task[]>;
  getArchivedTasks(userId: string): Promise<Task[]>;
  createTask(task: InsertTask, userId: string): Promise<Task>;
  completeTask(id: string, userId: string): Promise<Task | undefined>;
  deleteTask(id: string, userId: string): Promise<void>;
  reorderTasks(taskIds: string[], userId: string): Promise<void>;
  archiveCompletedTasks(userId: string): Promise<void>;
  restoreTask(id: string, userId: string): Promise<Task | undefined>;
  permanentlyDeleteTask(id: string, userId: string): Promise<void>;
  emptyBin(userId: string): Promise<void>;
  getUser(userId: string): Promise<User | undefined>;
  markUserAsPaid(userId: string): Promise<User | undefined>;
  markPaymentPending(userId: string, reference: string, plan: string): Promise<User | undefined>;
  getPendingPayments(): Promise<User[]>;
  getOrCreatePayIdReference(userId: string): Promise<string>;
  setUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getTasks(userId: string): Promise<Task[]> {
    return db.select().from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.completed, false)))
      .orderBy(asc(tasks.position));
  }

  async getCompletedTasks(userId: string): Promise<Task[]> {
    return db.select().from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.completed, true), eq(tasks.archived, false)))
      .orderBy(asc(tasks.completedAt));
  }

  async getArchivedTasks(userId: string): Promise<Task[]> {
    return db.select().from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.archived, true)))
      .orderBy(asc(tasks.archivedAt));
  }

  async createTask(insertTask: InsertTask, userId: string): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({ ...insertTask, userId })
      .returning();
    return task;
  }

  async completeTask(id: string, userId: string): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ completed: true, completedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: string, userId: string): Promise<void> {
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  }

  async reorderTasks(taskIds: string[], userId: string): Promise<void> {
    for (let i = 0; i < taskIds.length; i++) {
      await db.update(tasks)
        .set({ position: i })
        .where(and(eq(tasks.id, taskIds[i]), eq(tasks.userId, userId)));
    }
  }

  async archiveCompletedTasks(userId: string): Promise<void> {
    await db.update(tasks)
      .set({ archived: true, archivedAt: new Date() })
      .where(and(eq(tasks.userId, userId), eq(tasks.completed, true), eq(tasks.archived, false)));
  }

  async restoreTask(id: string, userId: string): Promise<Task | undefined> {
    const [task] = await db.update(tasks)
      .set({ archived: false, archivedAt: null, completed: false, completedAt: null })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId), eq(tasks.archived, true)))
      .returning();
    return task || undefined;
  }

  async permanentlyDeleteTask(id: string, userId: string): Promise<void> {
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId), eq(tasks.archived, true)));
  }

  async emptyBin(userId: string): Promise<void> {
    await db.delete(tasks).where(and(eq(tasks.userId, userId), eq(tasks.archived, true)));
  }

  async getUser(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user || undefined;
  }

  async markUserAsPaid(userId: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ hasPaid: new Date(), paymentPending: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async markPaymentPending(userId: string, reference: string, plan: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ paymentPending: new Date(), payIdReference: reference, subscriptionPlan: plan, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getPendingPayments(): Promise<User[]> {
    return db.select().from(users)
      .where(and(
        sql`${users.paymentPending} IS NOT NULL`,
        sql`${users.hasPaid} IS NULL`
      ));
  }

  async getOrCreatePayIdReference(userId: string): Promise<string> {
    const user = await this.getUser(userId);
    if (user?.payIdReference) {
      return user.payIdReference;
    }
    const reference = `WDID-${userId.slice(-8).toUpperCase()}`;
    await db.update(users)
      .set({ payIdReference: reference, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return reference;
  }

  async setUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ isAdmin: isAdmin ? 'true' : null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }
}

export const storage = new DatabaseStorage();
