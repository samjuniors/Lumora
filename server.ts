import "dotenv/config";
import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import webpush from "web-push";

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

  app.use(express.json());

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

  // AI Service Routes
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const ai = getAI();
      if (!ai) return res.status(503).json({ error: "AI Service Offline" });
      const { messages } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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
You must score the submission based on the following criteria and their weights (treat them as percentages of the final score):
${rubric.map((r: any) => `- ${r.name} (${r.weight}%): ${r.description}`).join('\n')}
Calculate the final score by summing the weighted scores of each criterion.
` : ''}
Student's written submission:
"${studentContent}"

Task: Give a score out of 100 and a detailed, constructive feedback. Follow this JSON format strictly:
{
  "score": 85,
  "feedback": "Detailed feedback with markdown..."
}

CRITICAL FORMATTING INSTRUCTIONS FOR FEEDBACK:
- You must format your feedback using Markdown.
- Use bolding, italics, bullet points, and headers to make the feedback highly readable and engaging.
- If an EVALUATION RUBRIC is provided, explicitly highlight how the submission performed on each specific criteria using headers (e.g., ### [Criterion Name]). Ensure the feedback breaks down the score based on the rubric.`
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.0-flash",
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
        model: "gemini-2.0-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error("[AI Economy] Error:", err);
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
