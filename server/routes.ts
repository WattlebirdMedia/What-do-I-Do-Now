import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getStripeClient } from "./stripeClient";
import { insertTaskSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get all pending tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error: any) {
      console.error('Get tasks error:', error);
      res.status(500).json({ error: 'Failed to get tasks' });
    }
  });

  // Get completed tasks
  app.get("/api/tasks/completed", async (req, res) => {
    try {
      const tasks = await storage.getCompletedTasks();
      res.json(tasks);
    } catch (error: any) {
      console.error('Get completed tasks error:', error);
      res.status(500).json({ error: 'Failed to get completed tasks' });
    }
  });

  // Create a new task
  app.post("/api/tasks", async (req, res) => {
    try {
      const existingTasks = await storage.getTasks();
      const position = existingTasks.length;
      
      const validatedData = insertTaskSchema.parse({
        text: req.body.text,
        position: position
      });
      
      const task = await storage.createTask(validatedData);
      res.json(task);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Invalid task data', details: error.errors });
      }
      console.error('Create task error:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Complete a task
  app.patch("/api/tasks/:id/complete", async (req, res) => {
    try {
      const task = await storage.completeTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error: any) {
      console.error('Complete task error:', error);
      res.status(500).json({ error: 'Failed to complete task' });
    }
  });

  // Delete a task
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete task error:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  // Reorder tasks (for skip functionality)
  app.post("/api/tasks/reorder", async (req, res) => {
    try {
      const { taskIds } = req.body;
      if (!Array.isArray(taskIds)) {
        return res.status(400).json({ error: 'taskIds must be an array' });
      }
      await storage.reorderTasks(taskIds);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Reorder tasks error:', error);
      res.status(500).json({ error: 'Failed to reorder tasks' });
    }
  });

  // Clear completed tasks
  app.delete("/api/tasks/completed", async (req, res) => {
    try {
      await storage.clearCompletedTasks();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Clear completed tasks error:', error);
      res.status(500).json({ error: 'Failed to clear completed tasks' });
    }
  });

  // Tip jar checkout endpoint
  app.post("/api/tip-checkout", async (req, res) => {
    try {
      const { amount } = req.body;
      const tipAmount = amount || 500; // Default $5.00

      const stripe = await getStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Support What Do I Do Now?',
              description: 'Thank you for supporting this app!',
            },
            unit_amount: tipAmount,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}?tip=success`,
        cancel_url: `${baseUrl}?tip=cancelled`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Tip checkout error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  return httpServer;
}
