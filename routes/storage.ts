import { Router, Response } from "express";
import { getS3, logger, AuthenticatedRequest } from "./shared";
import multer from "multer";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Cloud Storage R2 file upload
router.post("/storage/upload", upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const s3 = getS3();
    if (!s3 || !process.env.R2_BUCKET_NAME) {
      return res.status(503).json({ error: "Storage Service Offline or Misconfigured" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const { path: folderPath } = req.body;
    const cleanPath = (folderPath || "general").replace(/^\/|\/$/g, "");
    
    // Clean-up filename and append unique salt parameter
    const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${cleanPath}/${Date.now()}_${originalName}`;
    const bucket = process.env.R2_BUCKET_NAME.trim();

    logger.info({ id: req.id, key, size: req.file.size }, "Storage R2: Initiating upload operation");

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3.send(command);
    
    const publicUrl = `${process.env.VITE_R2_PUBLIC_URL!.trim()}/${key}`;
    logger.info({ id: req.id, publicUrl }, "Storage R2: Upload completed successfully");
    res.json({ publicUrl, key });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Storage R2: Upload failed");
    res.status(500).json({ error: message });
  }
});

// Cloud Storage R2 file delete
router.post("/storage/delete", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const s3 = getS3();
    if (!s3 || !process.env.R2_BUCKET_NAME) {
      return res.status(503).json({ error: "Storage Service Offline or Misconfigured" });
    }
    
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Missing Target URL parameter" });
    }

    const bucket = process.env.R2_BUCKET_NAME;
    const publicUrlBase = process.env.VITE_R2_PUBLIC_URL;
    
    if (!publicUrlBase || !url.startsWith(publicUrlBase)) {
      return res.status(400).json({ error: "Invalid or missing R2 Public URL base" });
    }

    const key = url.replace(`${publicUrlBase}/`, "");
    logger.warn({ id: req.id, key }, "Storage R2: Deleting target object from bucket");

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3.send(command);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Storage R2: Deletion error");
    res.status(500).json({ error: message });
  }
});

// Proxy route for loading high-stakes external images safely to bypass CORS
router.get("/proxy-image", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL query parameter is required" });
    }

    logger.info({ id: req.id, url }, "Resource Proxy: Relaying safe external image stream");
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      logger.error({ id: req.id, url, statusCode: response.status }, "Resource Proxy: Relay retrieval failed");
      return res.status(response.status).json({ error: `External fetch failed: ${response.statusText}` });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for an hour
    res.send(Buffer.from(buffer));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Resource Proxy: Relay fault");
    res.status(500).json({ error: "Failed to proxy image: " + message });
  }
});

// Mock notification dispatch emailing service
router.post("/send-email", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { to, subject } = req.body;
    logger.info({ id: req.id, to, subject }, "Outbound Email: Enqueuing mock dispatch sequence");
    res.json({ success: true, provider: 'mock' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;
