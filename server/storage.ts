import { users, tasks, type User, type InsertUser, type Task, type InsertTask } from "@shared/schema";
import { db } from "./db";
import { eq, asc, isNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getTasks(): Promise<Task[]>;
  getCompletedTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  completeTask(id: string): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  reorderTasks(taskIds: string[]): Promise<void>;
  clearCompletedTasks(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks)
      .where(eq(tasks.completed, false))
      .orderBy(asc(tasks.position));
  }

  async getCompletedTasks(): Promise<Task[]> {
    return db.select().from(tasks)
      .where(eq(tasks.completed, true))
      .orderBy(asc(tasks.completedAt));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async completeTask(id: string): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ completed: true, completedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async reorderTasks(taskIds: string[]): Promise<void> {
    for (let i = 0; i < taskIds.length; i++) {
      await db.update(tasks)
        .set({ position: i })
        .where(eq(tasks.id, taskIds[i]));
    }
  }

  async clearCompletedTasks(): Promise<void> {
    const result = await db.delete(tasks).where(eq(tasks.completed, true)).returning();
    console.log('Cleared completed tasks:', result.length);
  }
}

export const storage = new DatabaseStorage();
