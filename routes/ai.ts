import { Router, Response } from "express";
import { getAI, logger, AuthenticatedRequest } from "./shared";

const router = Router();

// Study pet conversation loop
router.post("/ai/chat", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ai = getAI();
    if (!ai) return res.status(503).json({ error: "AI Service Offline" });
    const { messages } = req.body;
    logger.info({ id: req.id }, "AI Chat System: Launching query to tutor model");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: messages,
      config: {
        systemInstruction: "You are Nova, a friendly virtual study pet and tutor. You help students learn, stay motivated, and explain concepts simply. Use emojis and be encouraging!"
      }
    });
    res.json({ text: response.text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "AI Chat System: Execution error");
    res.status(500).json({ error: message });
  }
});

// Draft a mission template based on user topic
router.post("/ai/mission-template", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ai = getAI();
    if (!ai) return res.status(503).json({ error: "AI Service Offline" });
    const { topic } = req.body;
    logger.info({ id: req.id, topic }, "AI Templates: Draft template requested");
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "AI Templates: Failed to draft content");
    res.status(500).json({ error: message });
  }
});

// Expert AI assessment and grading on a submission
router.post("/ai/assess", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ai = getAI();
    if (!ai) return res.status(503).json({ error: "AI Service Offline" });
    const { assignmentPrompt, instructions, studentContent, attachments, rubric } = req.body;
    logger.info({ id: req.id }, "AI Evaluator: Assessing assignment submission");
    
    const defaultInstructions = "Evaluate the submission carefully based on accuracy, completeness, and adherence to the prompt.";
    
    interface RubricItem {
      name: string;
      weight: number;
      description: string;
    }

    const parts: any[] = [{
      text: `You are an expert AI teacher assessing a student's submission.
Assignment description:
"${assignmentPrompt}"

Special Instructions from Teacher:
"${instructions || defaultInstructions}"

${rubric && rubric.length > 0 ? `EVALUATION RUBRIC:
You must score the submission based on the following criteria and their weights:
${rubric.map((r: RubricItem) => `- ${r.name} (${r.weight}%): ${r.description}`).join('\n')}
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "AI Evaluator: Submission scoring failed");
    res.status(500).json({ error: message });
  }
});

// Cohort aggregated analytics trend summaries
router.post("/ai/analyze-performance", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ai = getAI();
    if (!ai) return res.status(503).json({ error: "AI Service Offline" });
    const { stats } = req.body;
    logger.info({ id: req.id }, "AI Aggregations: Digesting classroom cohort results");
    const prompt = `Analyze this student performance data and provide actionable teaching insights. 
    Identify trends, struggling students, and top performers. 
    Keep it concise and professional.
    Data: ${JSON.stringify(stats)}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    res.json({ text: response.text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "AI Aggregations: Cohort digest faulted");
    res.status(500).json({ error: message });
  }
});

// The Oracle: Strategic student roadmap feedback
router.post("/ai/academic-roadmap", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ai = getAI();
    if (!ai) return res.status(503).json({ error: "AI Service Offline" });
    const { submissions } = req.body;
    logger.info({ id: req.id }, "AI Oracle: Consulting trajectory prediction engine");
    
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "AI Oracle: Consulting error");
    res.status(500).json({ error: message });
  }
});

// Strategic admin insights on platform economics and tax pools
router.post("/ai/economy-insights", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ai = getAI();
    if (!ai) return res.status(503).json({ error: "AI Service Offline" });
    const { stats } = req.body;
    logger.info({ id: req.id }, "AI Economics: Extracting corporate efficiency indices");
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "AI Economics: Strategy pull rejected");
    res.status(500).json({ error: message });
  }
});

export default router;
