import { Attachment } from '../types';

export async function chatWithAI(messages: { role: string; parts: { text: string }[] }[]): Promise<string> {
  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Server error");
    }
    
    const data = await response.json();
    return data.text || "I'm a bit sleepy right now! Try again later.";
  } catch (error) {
    console.error("AI Chat failed:", error);
    return "Oops, my connection is a bit wobbly! Let's try again in a moment.";
  }
}

export async function generateMissionTemplate(topic: string): Promise<{ name: string, description: string, instructions: string, isBonus: boolean }> {
  try {
    const response = await fetch("/api/ai/mission-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });

    if (!response.ok) throw new Error("Server error");
    
    return await response.json();
  } catch (err) {
    console.error("Template generation failed:", err);
    return {
      name: "New Mission",
      description: "Complete this mission to earn rewards.",
      instructions: "Follow the steps discussed in class.",
      isBonus: false
    };
  }
}

export async function assessSubmission(
  assignmentPrompt: string, 
  instructions: string, 
  studentContent: string,
  attachments?: Attachment[],
  rubric?: { name: string; description: string; weight: number }[]
): Promise<{ score: number, feedback: string }> {
  try {
    const response = await fetch("/api/ai/assess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentPrompt, instructions, studentContent, attachments, rubric }),
    });

    if (!response.ok) throw new Error("Server error");
    
    return await response.json();
  } catch (error) {
    console.error("AI Assessment failed:", error);
    return {
      score: 0,
      feedback: 'Failed to assess due to an error.'
    };
  }
}

export async function analyzeStudentPerformance(stats: any[]): Promise<string> {
  try {
    const response = await fetch("/api/ai/analyze-performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats }),
    });

    if (!response.ok) throw new Error("Server error");
    
    const data = await response.json();
    return data.text || "No analysis available.";
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "Failed to generate AI insights. Please check your connection.";
  }
}
