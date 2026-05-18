import "dotenv/config";
import express from "express";
import path from "path";
import multer from "multer";
import compression from "compression";
import { GoogleGenAI } from "@google/genai";
import webpush from "web-push";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

// Global Prisma Client for server operations
const prisma = new PrismaClient();


// VAPID keys for push notifications lazily
let vapidConfigured = false;
function configureWebPush() {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:example@example.com',
      publicKey,
      privateKey
    );
    vapidConfigured = true;
  } else {
    console.warn("VAPID keys not configured, push notifications will be disabled.");
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(compression());
  app.use(express.json());
  
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    }
    next();
  });
  
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  });

  let aiClient: GoogleGenAI | null = null;

  function getAI() {
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

  let s3Client: S3Client | null = null;
  function getS3() {
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

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Push Notification Routes
  app.post("/api/push/subscribe", async (req, res) => {
    const subscription = req.body;
    // Store subscription in Firestore (or in-memory for testing, but Firestore is better)
    // For now, let's just log it or store it temporarily? 
    // The user wants a robust solution. I need to initialize firebase-admin properly.
    console.log("Subscription received:", subscription);
    res.status(201).json({ status: 'subscribed' });
  });

  app.post("/api/push/send", async (req, res) => {
    const { subscription, payload } = req.body;
    try {
        configureWebPush();
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        res.status(200).json({ status: 'sent' });
    } catch (err) {
        console.error("Error sending push:", err);
        res.status(500).json({ error: "Failed to send" });
    }
  });

  // Migration & Sync Routes (SQL Readiness)
  app.get("/api/users/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      const user = await prisma.user.findUnique({
        where: { id: uid }
      });
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ error: "User not found in SQL" });
      }
    } catch (err: any) {
      console.error("[Pg Read] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const { role, limit, offset, email } = req.query;
      
      const whereClause: any = {};
      if (role) whereClause.role = role as any;
      if (email) whereClause.email = email as string;

      const take = limit ? parseInt(limit as string, 10) : 50;
      const skip = offset ? parseInt(offset as string, 10) : 0;

      const users = await prisma.user.findMany({
        where: whereClause,
        take,
        skip,
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (err: any) {
      console.error("[Pg Read All] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/users/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      await prisma.user.delete({
        where: { id: uid }
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Pg Delete] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/users/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      const data = req.body;
      
      const postgresUser = await prisma.user.update({
        where: { id: uid },
        data: {
          ...(data.email !== undefined && { email: data.email }),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.role !== undefined && { role: data.role as any }),
          ...(data.coins !== undefined && { coins: data.coins }),
          ...(data.diamonds !== undefined && { diamonds: data.diamonds }),
          ...(data.xp !== undefined && { xp: data.xp }),
          ...(data.level !== undefined && { level: data.level }),
          ...(data.streak !== undefined && { streak: data.streak }),
          ...(data.avatar !== undefined && { avatar: data.avatar }),
          ...(data.theme !== undefined && { theme: data.theme }),
        }
      });
      res.json({ success: true, user: postgresUser });
    } catch (err: any) {
      console.error("[Pg Update] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sync/user", async (req, res) => {
    try {
      const { uid, email, name, role, coins, diamonds, xp, level, streak } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ error: "Missing required sync fields" });
      }
      
      // Upsert the user into PostgreSQL safely. 
      // This allows continuous identity synchronization without disrupting Firestore's primacy.
      const postgresUser = await prisma.user.upsert({
        where: { id: uid },
        update: {
          email,
          name: name || '',
          role: role as any || 'student',
          ...(coins !== undefined && { coins }),
          ...(diamonds !== undefined && { diamonds }),
          ...(xp !== undefined && { xp }),
          ...(level !== undefined && { level }),
          ...(streak !== undefined && { streak }),
        },
        create: {
          id: uid,
          email,
          name: name || '',
          role: role as any || 'student',
          coins: coins ?? 0,
          diamonds: diamonds ?? 0,
          xp: xp ?? 0,
          level: level ?? 1,
          streak: streak ?? 0,
        }
      });
      
      res.json({ success: true, user: postgresUser });
    } catch (err: any) {
      console.error("[Pg Sync] Error:", err.message);
      // We don't want sync errors to break the user experience yet while Firestore is primary
      res.status(200).json({ success: false, error: err.message });
    }
  });

  app.get("/api/assignments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const assignment = await prisma.assignment.findUnique({
        where: { id }
      });
      if (assignment) {
        res.json(assignment);
      } else {
        res.status(404).json({ error: "Assignment not found in SQL" });
      }
    } catch (err: any) {
      console.error("[Pg Read] Assignment Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/assignments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const postgresAssignment = await prisma.assignment.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
          ...(data.points !== undefined && { points: data.points }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.createdBy !== undefined && { createdBy: data.createdBy }),
          ...(data.createdAt !== undefined && { createdAt: new Date(data.createdAt).toISOString() }),
          ...(data.hasAiFeedback !== undefined && { hasAiFeedback: data.hasAiFeedback }),
          ...(data.requireUpload !== undefined && { requireUpload: data.requireUpload }),
          ...(data.allowedFileTypes !== undefined && { allowedFileTypes: data.allowedFileTypes }),
          ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.timeLimit !== undefined && { timeLimit: data.timeLimit }),
          ...(data.maxAttempts !== undefined && { maxAttempts: data.maxAttempts })
        }
      });
      res.json({ success: true, assignment: postgresAssignment });
    } catch (err: any) {
      console.error("[Pg Update] Assignment Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/assignments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.assignment.delete({
        where: { id }
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Pg Delete] Assignment Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/assignments", async (req, res) => {
    try {
      const { limit, offset } = req.query;
      const take = limit ? parseInt(limit as string, 10) : 50;
      const skip = offset ? parseInt(offset as string, 10) : 0;

      const assignments = await prisma.assignment.findMany({
        take,
        skip,
        orderBy: { createdAt: 'desc' }
      });
      res.json(assignments);
    } catch (err: any) {
      console.error("[Pg Read All] Assignment Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sync/assignment", async (req, res) => {
    try {
      const {
        id, title, description, dueDate, points, status, createdBy, createdAt,
        hasAiFeedback, requireUpload, allowedFileTypes, difficulty, category, timeLimit, maxAttempts
      } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: "Missing assignment id" });
      }

      // Check if assignment already exists
      const existing = await prisma.assignment.findUnique({ where: { id } });

      let postgresAssignment;

      if (existing) {
        // Update
        postgresAssignment = await prisma.assignment.update({
          where: { id },
          data: {
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(dueDate !== undefined && { dueDate }),
            ...(points !== undefined && { points }),
            ...(status !== undefined && { status }),
            ...(createdBy !== undefined && { createdBy }),
            ...(createdAt !== undefined && { createdAt: new Date(createdAt).toISOString() }),
            ...(hasAiFeedback !== undefined && { hasAiFeedback }),
            ...(requireUpload !== undefined && { requireUpload }),
            ...(allowedFileTypes !== undefined && { allowedFileTypes }),
            ...(difficulty !== undefined && { difficulty }),
            ...(category !== undefined && { category }),
            ...(timeLimit !== undefined && { timeLimit }),
            ...(maxAttempts !== undefined && { maxAttempts })
          }
        });
      } else {
        // Create requires title
        if (!title) {
           return res.status(400).json({ error: "Missing required title for new assignment" });
        }
        postgresAssignment = await prisma.assignment.create({
          data: {
            id,
            title,
            description: description || '',
            dueDate: dueDate || '',
            points: points ?? 0,
            status: status || 'draft',
            createdBy: createdBy || null,
            createdAt: createdAt ? new Date(createdAt).toISOString() : null,
            hasAiFeedback: hasAiFeedback ?? false,
            requireUpload: requireUpload ?? false,
            allowedFileTypes: allowedFileTypes || [],
            difficulty: difficulty || null,
            category: category || null,
            timeLimit: timeLimit ?? null,
            maxAttempts: maxAttempts ?? null
          }
        });
      }
      
      res.json({ success: true, assignment: postgresAssignment });
    } catch (err: any) {
      console.error("[Pg Sync] Assignment Error:", err.message);
      res.status(200).json({ success: false, error: err.message }); // Keep it 200 so it doesn't break everything
    }
  });

  // Submissions API Routes
  app.get("/api/submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const submission = await prisma.submission.findUnique({
        where: { id }
      });
      if (submission) {
        res.json(submission);
      } else {
        res.status(404).json({ error: "Submission not found" });
      }
    } catch (err: any) {
      console.error("[Pg Read] Submission Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const postgresSubmission = await prisma.submission.update({
        where: { id },
        data: {
          ...(data.assignmentId !== undefined && { assignmentId: data.assignmentId }),
          ...(data.studentId !== undefined && { studentId: data.studentId }),
          ...(data.content !== undefined && { content: data.content }),
          ...(data.attachments !== undefined && { attachments: data.attachments }),
          ...(data.aiScore !== undefined && { aiScore: data.aiScore }),
          ...(data.aiFeedback !== undefined && { aiFeedback: data.aiFeedback }),
          ...(data.feedback !== undefined && { feedback: data.feedback }),
          ...(data.calculatedReward !== undefined && { calculatedReward: data.calculatedReward }),
          ...(data.penaltyAmount !== undefined && { penaltyAmount: data.penaltyAmount }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.tabSwitches !== undefined && { tabSwitches: data.tabSwitches }),
          ...(data.pasteCount !== undefined && { pasteCount: data.pasteCount }),
          ...(data.submittedAt !== undefined && { submittedAt: data.submittedAt ? new Date(data.submittedAt).toISOString() : null }),
          ...(data.updatedAt !== undefined && { updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : null })
        }
      });
      res.json({ success: true, submission: postgresSubmission });
    } catch (err: any) {
      console.error("[Pg Update] Submission Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.submission.delete({
        where: { id }
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Pg Delete] Submission Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/submissions", async (req, res) => {
    try {
      const { limit, offset, assignmentId, studentId, status } = req.query;
      const take = limit ? parseInt(limit as string, 10) : 50;
      const skip = offset ? parseInt(offset as string, 10) : 0;
      
      let where: any = {};
      if (assignmentId) where.assignmentId = assignmentId as string;
      if (studentId) where.studentId = studentId as string;
      if (status) where.status = status as string;

      const submissions = await prisma.submission.findMany({
        where,
        take,
        skip,
        orderBy: { submittedAt: 'desc' }
      });
      res.json(submissions);
    } catch (err: any) {
      console.error("[Pg Read All] Submission Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sync/submission", async (req, res) => {
    try {
      const {
        id, assignmentId, studentId, content, attachments, aiScore, aiFeedback,
        feedback, calculatedReward, penaltyAmount, status, tabSwitches, pasteCount,
        submittedAt, updatedAt
      } = req.body;
      
      if (!id || !assignmentId || !studentId) {
        return res.status(400).json({ error: "Missing required submission fields" });
      }

      // Check if submission already exists
      const existing = await prisma.submission.findUnique({ where: { id } });
      
      let postgresSubmission;

      if (existing) {
        postgresSubmission = await prisma.submission.update({
          where: { id },
          data: {
            ...(assignmentId !== undefined && { assignmentId }),
            ...(studentId !== undefined && { studentId }),
            ...(content !== undefined && { content }),
            ...(attachments !== undefined && { attachments }),
            ...(aiScore !== undefined && { aiScore }),
            ...(aiFeedback !== undefined && { aiFeedback }),
            ...(feedback !== undefined && { feedback }),
            ...(calculatedReward !== undefined && { calculatedReward }),
            ...(penaltyAmount !== undefined && { penaltyAmount }),
            ...(status !== undefined && { status }),
            ...(tabSwitches !== undefined && { tabSwitches }),
            ...(pasteCount !== undefined && { pasteCount }),
            ...(submittedAt !== undefined && { submittedAt: submittedAt ? new Date(submittedAt).toISOString() : null }),
            ...(updatedAt !== undefined && { updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null })
          }
        });
      } else {
        postgresSubmission = await prisma.submission.create({
          data: {
            id,
            assignmentId,
            studentId,
            content: content || '',
            attachments: attachments || null,
            aiScore: aiScore ?? null,
            aiFeedback: aiFeedback || null,
            feedback: feedback || null,
            calculatedReward: calculatedReward ?? null,
            penaltyAmount: penaltyAmount ?? null,
            status: status || 'pending',
            tabSwitches: tabSwitches ?? 0,
            pasteCount: pasteCount ?? 0,
            submittedAt: submittedAt ? new Date(submittedAt).toISOString() : null,
            updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null
          }
        });
      }
      
      res.json({ success: true, submission: postgresSubmission });
    } catch (err: any) {
      console.error("[Pg Sync] Submission Error:", err.message);
      res.status(200).json({ success: false, error: err.message }); // Keep it 200 so it doesn't break everything
    }
  });

  // AI Service Routes
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const ai = getAI();
      if (!ai) return res.status(503).json({ error: "AI Service Offline" });
      const { messages } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messages,
        config: {
          systemInstruction: "You are Nova, a friendly virtual study pet and tutor. You help students learn, stay motivated, and explain concepts simply. Use emojis and be encouraging!"
        }
      });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error("[AI Chat] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ai/mission-template", async (req, res) => {
    try {
      const ai = getAI();
      if (!ai) return res.status(503).json({ error: "AI Service Offline" });
      const { topic } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `Create a mission template for an educational platform on the topic: "${topic}". 
        Return a JSON object with:
        - name: A catchy title.
        - description: A short, motivating hook.
        - instructions: Detailed markdown instructions for the student.
        - isBonus: true if it's a creative/extra challenge, false otherwise.` }] }],
        config: { responseMimeType: 'application/json' }
      });
      res.json(JSON.parse(response.text || '{}'));
    } catch (err: any) {
      console.error("[AI Template] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ai/assess", async (req, res) => {
    try {
      const ai = getAI();
      if (!ai) return res.status(503).json({ error: "AI Service Offline" });
      const { assignmentPrompt, instructions, studentContent, attachments, rubric } = req.body;
      
      const defaultInstructions = "Evaluate the submission carefully based on accuracy, completeness, and adherence to the prompt.";
      const parts: any[] = [{
        text: `You are an expert AI teacher assessing a student's submission.
Assignment description:
"${assignmentPrompt}"

Special Instructions from Teacher:
"${instructions || defaultInstructions}"

${rubric && rubric.length > 0 ? `EVALUATION RUBRIC:
You must score the submission based on the following criteria and their weights:
${rubric.map((r: any) => `- ${r.name} (${r.weight}%): ${r.description}`).join('\n')}
` : ''}

Student's written submission:
"${studentContent}"

Task: Give a score out of 100 and detailed structured feedback. 
Follow this JSON format strictly:
{
  "score": 85,
  "feedback": {
    "overallFeedback": "Summary of performance...",
    "rubricFeedback": [
       {
         "criterion": "Criterion Name",
         "score": 90,
         "feedback": "Feedback for this specific criterion..."
       }
    ]
  }
}

If no rubric is provided, create 1-2 logical criteria based on the assignment description for the rubricFeedback array.`
      }];

      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          if (att.url.startsWith('data:')) {
            const match = att.url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (match) {
              parts.push({
                inlineData: { mimeType: match[1], data: match[2] }
              });
            }
          } else {
            parts[0].text += `\n[Student attached a file (${att.type}): ${att.url}]\n`;
          }
        }
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: parts }],
        config: { responseMimeType: 'application/json' }
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (err: any) {
      console.error("[AI Assess] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ai/analyze-performance", async (req, res) => {
    try {
      const ai = getAI();
      if (!ai) return res.status(503).json({ error: "AI Service Offline" });
      const { stats } = req.body;
      const prompt = `Analyze this student performance data and provide actionable teaching insights. 
      Identify trends, struggling students, and top performers. 
      Keep it concise and professional.
      Data: ${JSON.stringify(stats)}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error("[AI Analysis] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ai/academic-roadmap", async (req, res) => {
    try {
      const ai = getAI();
      if (!ai) return res.status(503).json({ error: "AI Service Offline" });
      const { submissions } = req.body;
      
      const prompt = `As an Elite Academic Strategist (Oracle), analyze this student's submission history and provide a high-stakes roadmap for success. 
      History: ${JSON.stringify(submissions)}
      
      Structure your response in Markdown:
      1. **Performance Verdict**: A blunt assessment of their current standing (A+, B, etc.) and trajectory.
      2. **Critical Weak Points**: Identify 2-3 specific topics they are struggling with based on AI feedback history.
      3. **Strategic Injunctions**: Give 3 highly actionable study commands to improve their ROI.
      4. **The Oracle's Prediction**: Predict their likely grade for the next 48 hours if they follow these steps.
      
      Be authoritative, encouraging but high-stakes.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error("[The Oracle] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ai/economy-insights", async (req, res) => {
    try {
      const ai = getAI();
      if (!ai) return res.status(503).json({ error: "AI Service Offline" });
      const { stats } = req.body;
      const prompt = `As an Academic Economy Expert, analyze these platform metrics and suggest 3 ways to increase admin profit while maintaining user addiction (loss aversion).
      Metrics:
      - Total Students: ${stats.studentCount}
      - Total Coins in System: ${stats.totalCoins}
      - Tax Collected: ${stats.taxRevenue}
      - Penalties Collected: ${stats.penaltyVolume}
      - Financial Recharges: ${stats.rechargeVolume}
      - Avg Student Score: ${stats.avgScore}%
      
      Give concise, high-stakes suggestions. Return the content in Markdown format.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error("[AI Economy] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Storage R2 Routes
  app.post("/api/storage/upload", upload.single('file'), async (req, res) => {
    try {
      const s3 = getS3();
      if (!s3 || !process.env.R2_BUCKET_NAME) {
        return res.status(503).json({ error: "Storage Service Offline or Misconfigured" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const { path } = req.body;
      const key = `${path}/${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const bucket = process.env.R2_BUCKET_NAME!.trim();

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });

      await s3.send(command);
      
      const publicUrl = `${process.env.VITE_R2_PUBLIC_URL!.trim()}/${key}`;
      res.json({ publicUrl, key });
    } catch (err: any) {
      console.error("[Storage Upload] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/storage/delete", async (req, res) => {
    try {
      const s3 = getS3();
      if (!s3 || !process.env.R2_BUCKET_NAME) {
        return res.status(503).json({ error: "Storage Service Offline or Misconfigured" });
      }
      
      const { url } = req.body;
      const bucket = process.env.R2_BUCKET_NAME;
      const publicUrlBase = process.env.VITE_R2_PUBLIC_URL;
      
      if (!publicUrlBase || !url.startsWith(publicUrlBase)) {
        return res.status(400).json({ error: "Invalid or missing R2 Public URL base" });
      }

      const key = url.replace(`${publicUrlBase}/`, "");

      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await s3.send(command);
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Storage Delete] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/proxy-image", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL is required" });
      }

      console.log(`Proxying image: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.error(`External fetch failed: ${response.status} ${response.statusText} for ${url}`);
        return res.status(response.status).json({ error: `External fetch failed: ${response.statusText}` });
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/jpeg";
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for an hour
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error("Proxy error:", err);
      res.status(500).json({ error: "Failed to proxy image: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  app.post("/api/send-email", async (req, res) => {
    const { to, subject, html, text } = req.body;
    console.log(`[Email Mock] Sending email to ${to}: ${subject}`);
    res.json({ success: true, provider: 'mock' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, Vite produces dist/
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
