import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema } from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { Resend } from "resend";

const PAYID = "+61466816177";
const MONTHLY_PRICE = "$6.69 USD";
const YEARLY_PRICE = "$53.53 USD";
const ADMIN_EMAIL = "wattlebirdmedia@gmail.com";
const TRIAL_DAYS = 7;

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendPaymentNotification(userEmail: string, userName: string, plan: string, reference: string, amount: string) {
  try {
    await resend.emails.send({
      from: "What Do I Do Now? <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      subject: `New Payment Pending Approval - ${reference}`,
      html: `
        <h2>New Payment Submitted</h2>
        <p>A user has marked their payment as complete and is waiting for approval.</p>
        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; font-weight: bold;">User:</td><td style="padding: 8px;">${userName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${userEmail}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Plan:</td><td style="padding: 8px;">${plan}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Amount:</td><td style="padding: 8px;">${amount}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Reference:</td><td style="padding: 8px;">${reference}</td></tr>
        </table>
        <p>Please verify the payment in your bank account and approve access at:</p>
        <p><a href="https://what-do-i-do-now.replit.app/admin">Admin Panel</a></p>
      `
    });
    console.log(`Payment notification email sent for ${reference}`);
  } catch (error) {
    console.error('Failed to send payment notification email:', error);
  }
}

const isInTrialPeriod = (createdAt: Date | null): boolean => {
  if (!createdAt) return false;
  const trialEndDate = new Date(createdAt);
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);
  return new Date() < trialEndDate;
};

const getTrialDaysRemaining = (createdAt: Date | null): number => {
  if (!createdAt) return 0;
  const trialEndDate = new Date(createdAt);
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);
  const remaining = Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, remaining);
};

const requirePaid = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await storage.getUser(userId);
    if (user?.hasPaid || isInTrialPeriod(user?.createdAt || null)) {
      next();
    } else {
      return res.status(403).json({ error: 'Payment required to access this feature' });
    }
  } catch (error) {
    console.error('Payment check error:', error);
    res.status(500).json({ error: 'Failed to verify payment status' });
  }
};

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
      const inTrial = isInTrialPeriod(user?.createdAt || null);
      const trialDaysRemaining = getTrialDaysRemaining(user?.createdAt || null);
      res.json({ 
        hasPaid: !!user?.hasPaid,
        paymentPending: !!user?.paymentPending,
        paidAt: user?.hasPaid || null,
        inTrial,
        trialDaysRemaining,
        trialExpired: !inTrial && !user?.hasPaid
      });
    } catch (error: any) {
      console.error('Billing status error:', error);
      res.status(500).json({ error: 'Failed to get billing status' });
    }
  });

  app.get("/api/billing/payid", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reference = await storage.getOrCreatePayIdReference(userId);
      res.json({ 
        payId: PAYID,
        monthlyPrice: MONTHLY_PRICE,
        yearlyPrice: YEARLY_PRICE,
        reference
      });
    } catch (error: any) {
      console.error('Get PayID error:', error);
      res.status(500).json({ error: 'Failed to get PayID details' });
    }
  });

  app.post("/api/billing/mark-paid", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { plan } = req.body;
      const user = await storage.getUser(userId);
      
      if (user?.hasPaid) {
        return res.json({ success: true, hasPaid: true, message: 'Already paid' });
      }
      
      if (user?.paymentPending) {
        return res.json({ success: true, paymentPending: true, message: 'Payment already pending verification' });
      }
      
      const reference = await storage.getOrCreatePayIdReference(userId);
      const selectedPlan = plan || 'monthly';
      const amount = selectedPlan === 'yearly' ? YEARLY_PRICE : MONTHLY_PRICE;
      await storage.markPaymentPending(userId, reference, selectedPlan);
      
      // Send email notification to admin
      const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown';
      await sendPaymentNotification(
        user?.email || 'No email provided',
        userName,
        selectedPlan,
        reference,
        amount
      );
      
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
        reference: u.payIdReference || `WDID-${u.id.slice(-8).toUpperCase()}`,
        plan: u.subscriptionPlan || 'monthly',
        amount: u.subscriptionPlan === 'yearly' ? YEARLY_PRICE : MONTHLY_PRICE
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

  app.get("/api/tasks", isAuthenticated, requirePaid, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasks(userId);
      res.json(tasks);
    } catch (error: any) {
      console.error('Get tasks error:', error);
      res.status(500).json({ error: 'Failed to get tasks' });
    }
  });

  app.get("/api/tasks/completed", isAuthenticated, requirePaid, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getCompletedTasks(userId);
      res.json(tasks);
    } catch (error: any) {
      console.error('Get completed tasks error:', error);
      res.status(500).json({ error: 'Failed to get completed tasks' });
    }
  });

  app.post("/api/tasks", isAuthenticated, requirePaid, async (req: any, res) => {
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

  app.patch("/api/tasks/:id/complete", isAuthenticated, requirePaid, async (req: any, res) => {
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

  app.post("/api/tasks/reorder", isAuthenticated, requirePaid, async (req: any, res) => {
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

  app.get("/api/tasks/bin", isAuthenticated, requirePaid, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getArchivedTasks(userId);
      res.json(tasks);
    } catch (error: any) {
      console.error('Get bin tasks error:', error);
      res.status(500).json({ error: 'Failed to get bin tasks' });
    }
  });

  app.post("/api/tasks/archive", isAuthenticated, requirePaid, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.archiveCompletedTasks(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Archive tasks error:', error);
      res.status(500).json({ error: 'Failed to archive tasks' });
    }
  });

  app.patch("/api/tasks/:id/restore", isAuthenticated, requirePaid, async (req: any, res) => {
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

  app.delete("/api/tasks/:id/permanent", isAuthenticated, requirePaid, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.permanentlyDeleteTask(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Permanent delete error:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  app.delete("/api/tasks/bin", isAuthenticated, requirePaid, async (req: any, res) => {
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
