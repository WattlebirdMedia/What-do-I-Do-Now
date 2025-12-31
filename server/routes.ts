import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema } from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

const PAYID = "tzm067@mebank.com.au";
const PAYMENT_AMOUNT = "$5 AUD";
const ADMIN_EMAIL = "wattlebirdmedia@gmail.com";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/billing/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json({ 
        hasPaid: !!user?.hasPaid,
        paymentPending: !!user?.paymentPending,
        paidAt: user?.hasPaid || null
      });
    } catch (error: any) {
      console.error('Billing status error:', error);
      res.status(500).json({ error: 'Failed to get billing status' });
    }
  });

  app.get("/api/billing/payid", isAuthenticated, async (req: any, res) => {
    res.json({ 
      payId: PAYID,
      amount: PAYMENT_AMOUNT,
      reference: `WDID-${req.user.claims.sub.slice(-8)}`
    });
  });

  app.post("/api/billing/mark-paid", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markPaymentPending(userId);
      res.json({ success: true, paymentPending: true });
    } catch (error: any) {
      console.error('Mark paid error:', error);
      res.status(500).json({ error: 'Failed to mark payment' });
    }
  });

  app.get("/api/admin/pending-payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.email !== ADMIN_EMAIL && user?.isAdmin !== 'true') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const pendingUsers = await storage.getPendingPayments();
      res.json(pendingUsers.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        paymentPending: u.paymentPending,
        reference: `WDID-${u.id.slice(-8)}`
      })));
    } catch (error: any) {
      console.error('Get pending payments error:', error);
      res.status(500).json({ error: 'Failed to get pending payments' });
    }
  });

  app.post("/api/admin/approve-payment/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const admin = await storage.getUser(adminId);
      
      if (admin?.email !== ADMIN_EMAIL && admin?.isAdmin !== 'true') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const { userId } = req.params;
      await storage.markUserAsPaid(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Approve payment error:', error);
      res.status(500).json({ error: 'Failed to approve payment' });
    }
  });

  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasks(userId);
      res.json(tasks);
    } catch (error: any) {
      console.error('Get tasks error:', error);
      res.status(500).json({ error: 'Failed to get tasks' });
    }
  });

  app.get("/api/tasks/completed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getCompletedTasks(userId);
      res.json(tasks);
    } catch (error: any) {
      console.error('Get completed tasks error:', error);
      res.status(500).json({ error: 'Failed to get completed tasks' });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existingTasks = await storage.getTasks(userId);
      const position = existingTasks.length;
      
      const validatedData = insertTaskSchema.parse({
        text: req.body.text,
        position: position
      });
      
      const task = await storage.createTask(validatedData, userId);
      res.json(task);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Invalid task data', details: error.errors });
      }
      console.error('Create task error:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  app.patch("/api/tasks/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const task = await storage.completeTask(req.params.id, userId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error: any) {
      console.error('Complete task error:', error);
      res.status(500).json({ error: 'Failed to complete task' });
    }
  });

  app.post("/api/tasks/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taskIds } = req.body;
      
      if (!Array.isArray(taskIds)) {
        return res.status(400).json({ error: 'taskIds must be an array' });
      }
      
      await storage.reorderTasks(taskIds, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Reorder tasks error:', error);
      res.status(500).json({ error: 'Failed to reorder tasks' });
    }
  });

  app.get("/api/tasks/bin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getArchivedTasks(userId);
      res.json(tasks);
    } catch (error: any) {
      console.error('Get bin tasks error:', error);
      res.status(500).json({ error: 'Failed to get bin tasks' });
    }
  });

  app.post("/api/tasks/archive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.archiveCompletedTasks(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Archive tasks error:', error);
      res.status(500).json({ error: 'Failed to archive tasks' });
    }
  });

  app.patch("/api/tasks/:id/restore", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const task = await storage.restoreTask(req.params.id, userId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error: any) {
      console.error('Restore task error:', error);
      res.status(500).json({ error: 'Failed to restore task' });
    }
  });

  app.delete("/api/tasks/:id/permanent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.permanentlyDeleteTask(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Permanent delete error:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  app.delete("/api/tasks/bin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.emptyBin(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Empty bin error:', error);
      res.status(500).json({ error: 'Failed to empty bin' });
    }
  });

  return httpServer;
}
