import type { Express } from "express";
import { createServer, type Server } from "http";
import { runMigrations } from 'stripe-replit-sync';
import { storage } from "./storage";
import { getUncachableStripeClient, getStripeSync } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import { insertTaskSchema } from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import express from "express";

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('DATABASE_URL not found, skipping Stripe init');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    try {
      const result = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`);
      if (result?.webhook?.url) {
        console.log(`Webhook configured: ${result.webhook.url}`);
      } else {
        console.log('Webhook setup completed (no URL returned)');
      }
    } catch (webhookError) {
      console.warn('Webhook setup skipped:', webhookError);
    }

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => {
        console.log('Stripe data synced');
      })
      .catch((err: any) => {
        console.error('Error syncing Stripe data:', err);
      });
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await initStripe();

  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];

      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature' });
      }

      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;
        const rawBody = (req as any).rawBody || req.body;

        if (!Buffer.isBuffer(rawBody)) {
          console.error('Webhook body is not a Buffer');
          return res.status(500).json({ error: 'Webhook processing error' });
        }

        await WebhookHandlers.processWebhook(rawBody, sig);

        res.status(200).json({ received: true });
      } catch (error: any) {
        console.error('Webhook error:', error.message);
        res.status(400).json({ error: 'Webhook processing error' });
      }
    }
  );

  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/billing/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json({ 
        hasPaid: !!user?.hasPaid,
        paidAt: user?.hasPaid || null
      });
    } catch (error: any) {
      console.error('Billing status error:', error);
      res.status(500).json({ error: 'Failed to get billing status' });
    }
  });

  app.post("/api/billing/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: { userId: user.id },
        });
        await storage.updateUserStripeInfo(userId, customer.id);
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'What Do I Do Now? - Lifetime Access',
              description: 'Unlock full access to the calm task manager app',
            },
            unit_amount: 500,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}?payment=cancelled`,
        metadata: { userId: user.id },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Checkout error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  app.post("/api/billing/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.body;

      if (sessionId) {
        const stripe = await getUncachableStripeClient();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status === 'paid' && session.metadata?.userId === userId) {
          await storage.markUserAsPaid(userId);
          return res.json({ success: true, hasPaid: true });
        }
        return res.json({ success: false, hasPaid: false, message: 'Payment not confirmed' });
      }

      const user = await storage.getUser(userId);
      res.json({ success: !!user?.hasPaid, hasPaid: !!user?.hasPaid });
    } catch (error: any) {
      console.error('Confirm payment error:', error);
      res.status(500).json({ error: 'Failed to confirm payment' });
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

  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteTask(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete task error:', error);
      res.status(500).json({ error: 'Failed to delete task' });
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

  app.post("/api/tasks/archive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.archiveCompletedTasks(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Archive completed tasks error:', error);
      res.status(500).json({ error: 'Failed to archive completed tasks' });
    }
  });

  app.get("/api/tasks/bin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const archivedTasks = await storage.getArchivedTasks(userId);
      res.json(archivedTasks);
    } catch (error: any) {
      console.error('Get archived tasks error:', error);
      res.status(500).json({ error: 'Failed to get archived tasks' });
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
      console.error('Permanent delete task error:', error);
      res.status(500).json({ error: 'Failed to permanently delete task' });
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
