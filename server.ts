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
    // Store subscription in Postgres if needed for cross-device alerts
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

  app.post("/api/users/:uid/follow", async (req, res) => {
    try {
      const followerId = req.params.uid;
      const { targetId } = req.body;
      
      await prisma.$transaction(async (tx) => {
        // Find existing arrays to append
        const f1 = await tx.user.findUnique({ where: { id: followerId }, select: { followingIds: true } });
        const f2 = await tx.user.findUnique({ where: { id: targetId }, select: { followerIds: true } });
        
        await tx.user.update({
          where: { id: followerId },
          data: { followingIds: { push: targetId } }
        });
        
        await tx.user.update({
          where: { id: targetId },
          data: { followerIds: { push: followerId } }
        });

        await tx.notification.create({
          data: {
            id: crypto.randomUUID(),
            userId: targetId,
            title: '👥 New Follower',
            message: 'A peer is now tracking your progress!',
            type: 'info',
            read: false
          }
        });
      });
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/users/:uid/unfollow", async (req, res) => {
    try {
      const followerId = req.params.uid;
      const { targetId } = req.body;
      
      const f1 = await prisma.user.findUnique({ where: { id: followerId }, select: { followingIds: true } });
      const f2 = await prisma.user.findUnique({ where: { id: targetId }, select: { followerIds: true } });
      
      await prisma.$transaction([
        prisma.user.update({
          where: { id: followerId },
          data: { followingIds: f1?.followingIds.filter(id => id !== targetId) || [] }
        }),
        prisma.user.update({
          where: { id: targetId },
          data: { followerIds: f2?.followerIds.filter(id => id !== followerId) || [] }
        })
      ]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/users/:uid/presence", async (req, res) => {
    try {
      await prisma.user.update({ where: { id: req.params.uid }, data: { presence: req.body.presence } });
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
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

  // --- NEW SQL MIGRATION ROUTES --- 

  // Notifications API
  app.get("/api/notifications", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) return res.json([]);
      const notifications = await prisma.notification.findMany({ where: { userId: String(userId) }, orderBy: { createdAt: "desc" } });
      // Map back to expected types
      res.json(notifications.map(n => ({
        ...n,
        createdAt: n.createdAt.getTime(),
        read: n.read == true
      })));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  
  app.post("/api/notifications", async (req, res) => {
    try {
      const { createdAt, ...data } = req.body;
      const notif = await prisma.notification.create({ 
        data: {
          ...data,
          createdAt: createdAt ? new Date(createdAt) : undefined
        }
      });
      res.json({
        ...notif,
        createdAt: notif.createdAt.getTime(),
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/notifications/:id", async (req, res) => {
    try {
      const updated = await prisma.notification.update({ where: { id: req.params.id }, data: req.body });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  
  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      await prisma.notification.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Invite Codes API
  app.get("/api/invite-codes", async (req, res) => {
    try {
      const { code } = req.query;
      if (code) {
        const invite = await prisma.inviteCode.findUnique({ where: { code: String(code) } });
        return res.json(invite ? [{
          ...invite,
          createdAt: invite.createdAt.getTime(),
          updatedAt: invite.updatedAt.getTime(),
        }] : []);
      }
      const invites = await prisma.inviteCode.findMany();
      res.json(invites.map(i => ({
          ...i,
          createdAt: i.createdAt.getTime(),
          updatedAt: i.updatedAt.getTime(),
      })));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/invite-codes", async (req, res) => {
    try {
      const { createdAt, updatedAt, ...data } = req.body;
      const invite = await prisma.inviteCode.create({ 
        data: {
          ...data,
          createdAt: createdAt ? new Date(createdAt) : undefined
        }
      });
      res.json({
          ...invite,
          createdAt: invite.createdAt.getTime(),
          updatedAt: invite.updatedAt.getTime(),
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/invite-codes/:id", async (req, res) => {
    try {
      const updated = await prisma.inviteCode.update({ where: { id: req.params.id }, data: req.body });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  
  app.delete("/api/invite-codes/:id", async (req, res) => {
    try {
      await prisma.inviteCode.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Settings API
  app.get("/api/settings", async (req, res) => {
    try {
      let settings = await prisma.settings.findUnique({ where: { id: "global" } });
      if (!settings) settings = await prisma.settings.create({ data: { id: "global" } });
      res.json({
        ...settings,
        updatedAt: settings.updatedAt.getTime()
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const updated = await prisma.settings.upsert({ where: { id: "global" }, update: req.body, create: { id: "global", ...req.body } });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Enrollments API
  app.get("/api/enrollments", async (req, res) => {
    try {
      const { studentId, assignmentId } = req.query;
      const where: any = {};
      if (studentId) where.studentId = String(studentId);
      if (assignmentId) where.assignmentId = String(assignmentId);
      const enrollments = await prisma.enrollment.findMany({ where });
      res.json(enrollments.map(e => ({
        ...e,
        enrolledAt: e.enrolledAt.getTime(),
        updatedAt: e.updatedAt.getTime(),
        graceDeadline: e.graceDeadline ? e.graceDeadline.getTime() : undefined
      })));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/enrollments", async (req, res) => {
    try {
      const { enrolledAt, updatedAt, graceDeadline, ...data } = req.body;
      const enroll = await prisma.enrollment.create({ 
        data: {
          ...data,
          enrolledAt: enrolledAt ? new Date(enrolledAt) : undefined,
          graceDeadline: graceDeadline ? new Date(graceDeadline) : undefined,
        }
      });
      res.json({
        ...enroll,
        enrolledAt: enroll.enrolledAt.getTime(),
        updatedAt: enroll.updatedAt.getTime(),
        graceDeadline: enroll.graceDeadline ? enroll.graceDeadline.getTime() : undefined
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/enrollments/:id", async (req, res) => {
    try {
      const { enrolledAt, updatedAt, graceDeadline, ...data } = req.body;
      const updated = await prisma.enrollment.update({ 
        where: { id: req.params.id }, 
        data: {
          ...data,
          enrolledAt: enrolledAt ? new Date(enrolledAt) : undefined,
          graceDeadline: graceDeadline ? new Date(graceDeadline) : undefined,
        } 
      });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  
  app.delete("/api/enrollments/:id", async (req, res) => {
    try {
      await prisma.enrollment.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Transactions API
  app.get("/api/transactions", async (req, res) => {
    try {
      const { userId, type } = req.query;
      const where: any = {};
      if (userId) {
        where.OR = [
          { senderId: String(userId) },
          { receiverId: String(userId) }
        ];
      }
      if (type) where.type = String(type);
      const txs = await prisma.transaction.findMany({ where, orderBy: { timestamp: "desc" } });
      res.json(txs.map(t => ({
        ...t,
        timestamp: t.timestamp.getTime(),
        updatedAt: t.updatedAt.getTime()
      })));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  
  app.post("/api/transactions/process", async (req, res) => {
    try {
      const { txData, userUpdates } = req.body;
      const { timestamp, updatedAt, ...safeTxData } = txData;
      // Atomic transaction: create history entry and update user balances
      const result = await prisma.$transaction(async (tx) => {
        const createdTx = await tx.transaction.create({ 
          data: {
            ...safeTxData,
            timestamp: timestamp ? new Date(timestamp) : undefined
          }
        });
        if (userUpdates && Array.isArray(userUpdates)) {
          for (const update of userUpdates) {
              const { where, data } = update;
              await tx.user.update({ where, data });
          }
        }
        return createdTx;
      });
      res.json({
        ...result,
        timestamp: result.timestamp.getTime(),
        updatedAt: result.updatedAt.getTime()
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const updated = await prisma.transaction.update({ where: { id: req.params.id }, data: req.body });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // --- DETERMINISTIC COOLDOWN ENDPOINTS ---

  app.post("/api/claim/daily", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "Missing userId" });
      
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const now = new Date();
      const lastClaim = user.lastRewardClaimedAt;
      
      // Check if already claimed today (UTC)
      if (lastClaim) {
        const lastClaimDay = new Date(lastClaim);
        if (
          lastClaimDay.getUTCFullYear() === now.getUTCFullYear() &&
          lastClaimDay.getUTCMonth() === now.getUTCMonth() &&
          lastClaimDay.getUTCDate() === now.getUTCDate()
        ) {
          return res.status(400).json({ error: "Already claimed today" });
        }
      }

      // Generate reward server-side
      const rollout = Math.random();
      let type: string;
      let value: number | string;
      let currency: 'coins' | 'diamonds' | 'xp' | 'item' | 'penalty';

      if (rollout < 0.10) { 
        type = 'item';
        const items = ['frame_gold', 'frame_neon', 'frame_cyber'];
        value = items[Math.floor(Math.random() * items.length)];
        currency = 'item';
      } else if (rollout < 0.30) {
        type = 'penalty';
        value = Math.floor(Math.random() * 20) + 1;
        currency = 'penalty';
      } else if (rollout < 0.60) {
        type = 'xp';
        value = Math.floor(Math.random() * 150) + 50;
        currency = 'xp';
      } else if (rollout < 0.85) {
        type = 'diamonds';
        value = Math.floor(Math.random() * 3) + 1;
        currency = 'diamonds';
      } else {
        type = 'coins';
        value = Math.floor(Math.random() * 3) + 1;
        currency = 'coins';
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            lastRewardClaimedAt: now,
            ...(currency === 'coins' && { coins: { increment: value as number } }),
            ...(currency === 'diamonds' && { diamonds: { increment: value as number } }),
            ...(currency === 'xp' && { xp: { increment: value as number } }),
          }
        });

        await tx.transaction.create({
          data: {
            id: crypto.randomUUID(),
            senderId: 'system',
            receiverId: userId,
            amount: typeof value === 'number' ? value : 0,
            currency: currency === 'penalty' ? 'coins' : currency as string,
            type: currency === 'penalty' ? 'penalty' : 'daily_reward',
            status: 'completed',
            message: `Daily Drop: ${type} ${value}`,
            timestamp: now
          }
        });
      });

      res.json({ success: true, reward: { type, value }, timestamp: now.getTime() });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/claim/resource", async (req, res) => {
    try {
      const { userId } = req.body;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const now = new Date();
      const lastCollect = user.lastCollectionAt;
      
      // 12 hour cooldown
      if (lastCollect) {
        const cooldownMs = 12 * 60 * 60 * 1000;
        if (now.getTime() - lastCollect.getTime() < cooldownMs) {
          return res.status(400).json({ error: "Collector on cooldown" });
        }
      }

      // Tiered Reward Calculation server-side
      const roller = Math.random();
      let coins = 0;
      let diamonds = 0;
      let tier = "Common";

      if (roller > 0.95) { // 5% Epic
          tier = "Epic";
          coins = Math.floor(Math.random() * 11) + 20; // 20-30
          diamonds = Math.floor(Math.random() * 4) + 2; // 2-5
      } else if (roller > 0.80) { // 15% Rare
          tier = "Rare";
          coins = Math.floor(Math.random() * 7) + 6; // 6-12
          diamonds = 1;
      } else { // 80% Common
          tier = "Common";
          coins = Math.floor(Math.random() * 4) + 2; // 2-5
          diamonds = 0;
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            lastCollectionAt: now,
            coins: { increment: coins },
            diamonds: { increment: diamonds }
          }
        });

        await tx.transaction.create({
          data: {
            id: crypto.randomUUID(),
            senderId: 'system',
            receiverId: userId,
            amount: coins + diamonds,
            currency: 'mixed',
            type: 'mission_reward',
            status: 'completed',
            message: `Resource Miner: ${coins} coins, ${diamonds} diamonds [${tier}]`,
            timestamp: now
          }
        });
      });

      res.json({ success: true, coins, diamonds, tier, timestamp: now.getTime() });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/claim/reset-collector", async (req, res) => {
    try {
      const { userId } = req.body;
      const resetCost = 3; // Diamonds
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: "User not found" });

      if (user.diamonds < resetCost) {
        return res.status(400).json({ error: "Insufficient diamonds" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            diamonds: { decrement: resetCost },
            lastCollectionAt: null 
          }
        });

        await tx.transaction.create({
          data: {
            id: crypto.randomUUID(),
            senderId: userId,
            receiverId: 'system',
            amount: resetCost,
            currency: 'diamonds',
            type: 'shop_purchase',
            status: 'completed',
            message: 'Instant Resource Collector Reset',
            timestamp: new Date()
          }
        });
      });

      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Vite middleware for development
  // ------------------------------------
  // Assignment Templates API
  // ------------------------------------
  app.get("/api/assignment-templates", async (req, res) => {
    try {
      const templates = await prisma.assignmentTemplate.findMany({ orderBy: { createdAt: "desc" } });
      res.json(templates.map(t => ({
        ...t,
        createdAt: t.createdAt.getTime(),
        updatedAt: t.updatedAt.getTime()
      })));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/assignment-templates", async (req, res) => {
    try {
      const { id, createdAt, updatedAt, ...data } = req.body;
      const template = await prisma.assignmentTemplate.create({ 
        data: {
          ...data,
          id: id || crypto.randomUUID(),
        }
      });
      res.json({
        ...template,
        createdAt: template.createdAt.getTime(),
        updatedAt: template.updatedAt.getTime(),
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/assignment-templates/:id", async (req, res) => {
    try {
      const { id, createdAt, updatedAt, ...data } = req.body;
      const updated = await prisma.assignmentTemplate.update({ 
        where: { id: req.params.id }, 
        data
      });
      res.json({
        ...updated,
        createdAt: updated.createdAt.getTime(),
        updatedAt: updated.updatedAt.getTime(),
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  
  app.delete("/api/assignment-templates/:id", async (req, res) => {
    try {
      await prisma.assignmentTemplate.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });


  // ------------------------------------
  // Syndicates API
  // ------------------------------------
  app.get("/api/syndicates", async (req, res) => {
    try {
      const syndicates = await prisma.syndicate.findMany({ orderBy: { score: "desc" } });
      res.json(syndicates.map(s => ({
        ...s,
        createdAt: s.createdAt.getTime(),
        updatedAt: s.updatedAt.getTime()
      })));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/syndicates", async (req, res) => {
    try {
      const { id, createdAt, updatedAt, ...data } = req.body;
      const s = await prisma.syndicate.create({ 
        data: {
          ...data,
          id: id || crypto.randomUUID(),
        }
      });
      res.json({
        ...s,
        createdAt: s.createdAt.getTime(),
        updatedAt: s.updatedAt.getTime(),
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/syndicates/:id", async (req, res) => {
    try {
      const s = await prisma.syndicate.findUnique({ where: { id: req.params.id } });
      if (!s) return res.status(404).json({ error: "Syndicate not found" });
      res.json({
        ...s,
        createdAt: s.createdAt.getTime(),
        updatedAt: s.updatedAt.getTime(),
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/syndicates/:id", async (req, res) => {
    try {
      const { id, createdAt, updatedAt, ...data } = req.body;
      const updated = await prisma.syndicate.update({ 
        where: { id: req.params.id }, 
        data
      });
      res.json({
        ...updated,
        createdAt: updated.createdAt.getTime(),
        updatedAt: updated.updatedAt.getTime(),
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  
  app.delete("/api/syndicates/:id", async (req, res) => {
    try {
      await prisma.syndicate.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ------------------------------------
  // Recharge Requests API
  // ------------------------------------
  app.get("/api/recharge-requests", async (req, res) => {
    try {
      const { userId } = req.query;
      const where: any = {};
      if (userId) where.userId = String(userId);

      const reqs = await prisma.rechargeRequest.findMany({ where, orderBy: { timestamp: "desc" } });
      res.json(reqs.map(r => ({
        ...r,
        timestamp: r.timestamp.getTime(),
        updatedAt: r.updatedAt.getTime()
      })));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/recharge-requests", async (req, res) => {
    try {
      const { id, timestamp, updatedAt, ...data } = req.body;
      const r = await prisma.rechargeRequest.create({ 
        data: {
          ...data,
          id: id || crypto.randomUUID(),
        }
      });
      res.json({
        ...r,
        timestamp: r.timestamp.getTime(),
        updatedAt: r.updatedAt.getTime(),
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/recharge-requests/:id", async (req, res) => {
    try {
      const { id, timestamp, updatedAt, ...data } = req.body;
      const updated = await prisma.rechargeRequest.update({ 
        where: { id: req.params.id }, 
        data
      });
      res.json({
        ...updated,
        timestamp: updated.timestamp.getTime(),
        updatedAt: updated.updatedAt.getTime(),
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  
  app.delete("/api/recharge-requests/:id", async (req, res) => {
    try {
      await prisma.rechargeRequest.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Pre-Registration API
  app.get("/api/pre-registered", async (req, res) => {
    try {
      const { email } = req.query;
      if (email) {
        const u = await prisma.preRegisteredUser.findUnique({ where: { email: String(email) } });
        return res.json(u ? [u] : []);
      }
      const users = await prisma.preRegisteredUser.findMany({ orderBy: { createdAt: "desc" } });
      res.json(users);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/pre-registered", async (req, res) => {
    try {
      const { id, createdAt, updatedAt, claimedAt, ...data } = req.body;
      const u = await prisma.preRegisteredUser.upsert({
        where: { email: data.email },
        update: data,
        create: {
          ...data,
          id: id || crypto.randomUUID(),
        }
      });
      res.json(u);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/pre-registered/:id", async (req, res) => {
    try {
      const { id, createdAt, updatedAt, claimedAt, ...data } = req.body;
      const u = await prisma.preRegisteredUser.update({
        where: { id: req.params.id },
        data: {
          ...data,
          claimedAt: claimedAt ? new Date(claimedAt) : undefined
        }
      });
      res.json(u);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/pre-registered/:id", async (req, res) => {
    try {
      await prisma.preRegisteredUser.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });


  // Maintenance & Penalty Sweep
  app.post("/api/maintenance/penalty-sweep", async (req, res) => {
    try {
      const { assignmentId } = req.body;
      const now = new Date();
      
      const result = await prisma.$transaction(async (tx) => {
        let penalizedCount = 0;
        const students = await tx.user.findMany({ where: { role: 'student' } });
        
        let assignments;
        if (assignmentId) {
          const a = await tx.assignment.findUnique({ where: { id: assignmentId } });
          assignments = a ? [a] : [];
        } else {
          assignments = await tx.assignment.findMany({ where: { status: 'published' } });
        }

        for (const a of assignments) {
          const dueDate = new Date(a.dueDate);
          if (dueDate > now) continue;

          for (const s of students) {
             const sub = await tx.submission.findFirst({ where: { studentId: s.id, assignmentId: a.id } });
             if (sub) continue;

             const enr = await tx.enrollment.findFirst({ where: { studentId: s.id, assignmentId: a.id } });
             if (enr && enr.status === 'missed') continue;

             penalizedCount++;
             const tax = 50; // Hard limit for high stakes
             const penalty = Math.min(s.coins, tax);
             
             if (enr) {
                await tx.enrollment.update({ where: { id: enr.id }, data: { status: 'missed', rewardEarned: -penalty } });
             } else {
                await tx.enrollment.create({
                  data: {
                    id: crypto.randomUUID(),
                    studentId: s.id,
                    assignmentId: a.id,
                    status: 'missed',
                    rewardEarned: -penalty,
                    enrolledAt: now
                  }
                });
             }

             if (penalty > 0) {
               await tx.user.update({ where: { id: s.id }, data: { coins: { decrement: penalty } } });
               await tx.transaction.create({
                 data: {
                   id: crypto.randomUUID(),
                   senderId: s.id,
                   receiverId: 'SYSTEM',
                   amount: penalty,
                   type: 'penalty',
                   message: `Missed mission: ${a.title}`,
                   status: 'completed'
                 }
               });
             }

             await tx.notification.create({
               data: {
                 id: crypto.randomUUID(),
                 userId: s.id,
                 title: '⚠️ MISSION PENALTY',
                 message: `You missed "${a.title}". ${penalty} coins deducted. Stay sharp.`,
                 type: 'alert'
               }
             });
          }
        }
        return { penalizedCount };
      });
      
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Achievements Progress (Mock for now as schema doesn't have it, but we can compute it)
  app.get("/api/users/:uid/achievement-progress", async (req, res) => {
    try {
      const userId = req.params.uid;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const subCount = await prisma.submission.count({ where: { studentId: userId, status: 'assessed' } });
      const perfectCount = await prisma.submission.count({ where: { studentId: userId, status: 'assessed', aiScore: { gte: 95 } } });
      const txCount = await prisma.transaction.count({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });

      res.json({
        wealth: user.coins,
        scholar: subCount,
        perfectionist: perfectCount,
        socialite: txCount,
        veteran: user.level,
        streaker: user.streak
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
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
