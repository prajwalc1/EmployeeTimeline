import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import type { User } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

// Type declarations moved to types.ts

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export function setupAuth(app: Express) {
  // Session is already set up in index.ts, don't set it up again here
  
  // Login route
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return res.status(401).json({ message: "Benutzer nicht gefunden" });
      }

      if (user.password !== password) {
        return res.status(401).json({ message: "Falsches Passwort" });
      }

      req.session.userId = user.id;
      req.session.authenticated = true;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        annualLeaveBalance: user.annualLeaveBalance
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Register route
  app.post("/api/register", async (req, res) => {
    const { username, password, name } = req.body;

    try {
      // Input validation
      if (!username || !password || !name) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password before storing
      const hashedPassword = await crypto.hash(password);

      const [user] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          name,
          annualLeaveBalance: 30 // Default value for new users
        })
        .returning();

      req.session.userId = user.id;
      req.session.authenticated = true;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        annualLeaveBalance: user.annualLeaveBalance
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out" });
    });
  });

  // Get current user
  app.get("/api/user", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId))
        .limit(1);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        annualLeaveBalance: user.annualLeaveBalance
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
}