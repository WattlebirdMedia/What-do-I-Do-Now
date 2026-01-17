import { Express, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage"; // your storage object
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthRequest extends Request {
  user?: {
    claims: {
      sub: string; // user id
      email: string;
      isAdmin: boolean;
    };
  };
}

// Middleware to protect routes
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = { claims: decoded };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Setup auth routes
export async function setupAuth(app: Express) {
  // ====== REGISTER ======
  app.post("/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password)
        return res.status(400).json({ error: "Email and password required" });

      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ error: "User already exists" });

      const user = await storage.createUser(email, password, firstName, lastName);

      const token = jwt.sign(
        { sub: user.id, email: user.email, isAdmin: user.isAdmin },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token, user });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  // ====== LOGIN ======
  app.post("/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ error: "Email and password required" });

      const user = await storage.verifyPassword(email, password);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign(
        { sub: user.id, email: user.email, isAdmin: user.isAdmin },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token, user });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Failed to login" });
    }
  });
}