import "dotenv/config";
import { Request, Response, NextFunction } from "express";
import { PrismaClient, User } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { S3Client } from "@aws-sdk/client-s3";
import webpush from "web-push";
import pino from "pino";
import crypto from "crypto";

// Global Prisma Client for database operations
export const prisma = new PrismaClient();

// Setup high-performance structured Pino Logger
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV !== "production" ? {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "UTC:yyyy-mm-dd HH:MM:ss.l",
      ignore: "pid,hostname",
    }
  } : undefined,
});

// Custom Authenticated Request interface to prevent typed errors
export interface AuthenticatedRequest extends Request {
  user?: Partial<User> & { id: string; role: string; email?: string | null };
  id?: string;
  file?: Express.Multer.File;
}

// Global Google GenAI Client lazily initialized
let aiClient: GoogleGenAI | null = null;
export function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Global S3/CloudR2 Client lazily initialized
let s3Client: S3Client | null = null;
export function getS3(): S3Client | null {
  if (!s3Client && process.env.R2_ACCESS_KEY_ID) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT?.trim().replace(/\/$/, ""),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      forcePathStyle: true
    });
  }
  return s3Client;
}

// VAPID Setup with production grade contact mailto
let vapidConfigured = false;
export function configureWebPush(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:luvkus8@gmail.com', // Updated to luvkus8@gmail.com as per Phase 3 requirements
      publicKey,
      privateKey
    );
    vapidConfigured = true;
    return true;
  } else {
    logger.warn("VAPID keys not configured, push notifications will be disabled.");
    return false;
  }
}

// ------------------------------------
// Core Route Middlewares
// ------------------------------------

export const requestIdMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const reqId = crypto.randomUUID();
  req.id = reqId;
  res.setHeader("X-Request-Id", reqId);
  next();
};

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const userIdHeader = req.headers['x-user-id'] || req.headers['x-user-id'.toLowerCase()];
    
    let userId: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      userId = authHeader.substring(7).trim();
    } else if (userIdHeader && typeof userIdHeader === 'string') {
      userId = userIdHeader.trim();
    }

    const isSyncRoute = req.path === "/api/sync/user";
    const isSelfProfileRoute = req.path === `/api/users/${userId}`;
    const isPreRegisteredRoute = req.path.startsWith("/api/pre-registered");
    const isInviteRoute = req.path.startsWith("/api/invite-codes");

    if (!userId) {
      if (isSyncRoute) {
        const bodyUid = req.body?.uid;
        if (bodyUid) {
          req.user = { id: bodyUid, role: req.body?.role || 'student', email: req.body?.email || '' };
          return next();
        }
      }
      return res.status(401).json({ error: "Authentication credentials required" });
    }

    // Lookup user in Postgres to check identity and role status
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      if (isSyncRoute || isSelfProfileRoute || isPreRegisteredRoute || isInviteRoute) {
        // Safe to allow onboarding pathways
        req.user = { id: userId, role: 'student', email: '' };
        return next();
      }
      return res.status(401).json({ error: "User session not found in database to complete operation" });
    }

    // Attach verified user profile info to the request object
    req.user = user;
    next();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: errorMsg }, "Auth Middleware Failure");
    res.status(500).json({ error: "Internal server error during authentication" });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "User not authenticated" });
  }
  
  const ADMIN_EMAILS = [
    'luvkus8@gmail.com',
    'luvkus8@gmail',
    'luvkush8@gmail.com'
  ];
  
  const isUserAdmin = user.role === 'admin' || user.role === 'superadmin' || ADMIN_EMAILS.includes((user.email || '').toLowerCase());
  
  if (!isUserAdmin) {
    return res.status(403).json({ error: "Forbidden: Administrator permissions required" });
  }
  next();
};

export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "User not authenticated" });
  }
  
  const ADMIN_EMAILS = [
    'luvkus8@gmail.com',
    'luvkus8@gmail',
    'luvkush8@gmail.com'
  ];
  
  const isUserSuperAdmin = user.role === 'superadmin' || ADMIN_EMAILS.includes((user.email || '').toLowerCase());
  
  if (!isUserSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super-administrator permissions required" });
  }
  next();
};

export const requireSelfOrAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  const { uid } = req.params;
  
  if (!user) {
    return res.status(401).json({ error: "User not authenticated" });
  }
  
  const ADMIN_EMAILS = [
    'luvkus8@gmail.com',
    'luvkus8@gmail',
    'luvkush8@gmail.com'
  ];
  
  const isUserAdmin = user.role === 'admin' || user.role === 'superadmin' || ADMIN_EMAILS.includes((user.email || '').toLowerCase());
  
  if (user.id !== uid && !isUserAdmin) {
    return res.status(403).json({ error: "Forbidden: Access denied to other student profiles" });
  }
  next();
};
