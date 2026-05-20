import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Import modules from our modular route directories
import { requestIdMiddleware, requireAuth, logger } from "./routes/shared";
import usersRouter from "./routes/users";
import assignmentsRouter from "./routes/assignments";
import submissionsRouter from "./routes/submissions";
import walletRouter from "./routes/wallet";
import aiRouter from "./routes/ai";
import notificationsRouter from "./routes/notifications";
import adminRouter from "./routes/admin";
import storageRouter from "./routes/storage";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Compress response payloads
  app.use(compression());
  
  // Security reinforcements
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  
  // CORS control
  app.use(cors({
    origin: true,
    credentials: true,
  }));

  // Global Rate Limiter to safeguard resources
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests from this IP, please try again later." }
  });
  
  // AI limiters to manage API quotas and maintain competitive tension
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Adjusted ceiling for active workspace development and oracle calls
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "AI endpoint limit reached. Academic elite status allows higher request throughput." }
  });

  app.use("/api/", globalLimiter);
  app.use("/api/ai/", aiLimiter);

  // Parsing JSON payloads
  app.use(express.json());
  
  // Request ID Tracing injector
  app.use(requestIdMiddleware);

  // Health endpoint bypasses all rate and auth interceptors
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "healthy", timestamp: Date.now() });
  });

  // Enforce session check on all other client-facing API channels
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/') && req.path !== '/api/health') {
      return requireAuth(req, res, next);
    }
    next();
  });
  
  // Cache prevention for fresh ledger updates
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    }
    next();
  });

  // Mount clean sub-routers under "/api" prefix
  app.use("/api", usersRouter);
  app.use("/api", assignmentsRouter);
  app.use("/api", submissionsRouter);
  app.use("/api", walletRouter);
  app.use("/api", aiRouter);
  app.use("/api", notificationsRouter);
  app.use("/api", adminRouter);
  app.use("/api", storageRouter);

  // ------------------------------------
  // Global Error Handler Middleware
  // ------------------------------------
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const traceId = (req as any).id || "unassigned";
    
    logger.error({ 
      traceId, 
      path: req.path, 
      method: req.method,
      err: errorMsg,
      stack: err instanceof Error ? err.stack : undefined 
    }, "Global Error Interceptor captured an unhandled exception");

    res.status(500).json({ 
      error: "Internal Server Fault Captured", 
      details: process.env.NODE_ENV !== "production" ? errorMsg : "Restricted diagnostics", 
      traceId 
    });
  });

  // Serve static UI assets or fallback spa handler
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT, host: "0.0.0.0", env: process.env.NODE_ENV || "development" }, "High-Stakes backend server initialized");
  });
}

startServer();
