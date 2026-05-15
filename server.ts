import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
