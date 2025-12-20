import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getStripeClient } from "./stripeClient";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
