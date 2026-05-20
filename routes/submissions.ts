import { Router, Response } from "express";
import { prisma, logger, AuthenticatedRequest } from "./shared";

const router = Router();

// Retrieve a single submission details
router.get("/submissions/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    logger.info({ id: req.id, submissionId: id }, "Submissions API: Retrieve requested");
    const submission = await prisma.submission.findUnique({
      where: { id }
    });
    if (submission) {
      res.json(submission);
    } else {
      res.status(404).json({ error: "Submission not found in Postgres SQL" });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Submissions API: Retrieve error");
    res.status(500).json({ error: message });
  }
});

// Partial update an existing submission
router.patch("/submissions/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    logger.info({ id: req.id, submissionId: id }, "Submissions API: Update request received");
    
    interface SubmissionUpdatePayload {
      assignmentId?: string;
      studentId?: string;
      content?: string;
      attachments?: any;
      aiScore?: number;
      aiFeedback?: string;
      feedback?: string;
      calculatedReward?: number;
      penaltyAmount?: number;
      status?: string;
      tabSwitches?: number;
      pasteCount?: number;
      submittedAt?: Date | null;
      updatedAt?: Date | null;
    }

    const updateObj: SubmissionUpdatePayload = {};
    if (data.assignmentId !== undefined) updateObj.assignmentId = data.assignmentId;
    if (data.studentId !== undefined) updateObj.studentId = data.studentId;
    if (data.content !== undefined) updateObj.content = data.content;
    if (data.attachments !== undefined) updateObj.attachments = data.attachments;
    if (data.aiScore !== undefined) updateObj.aiScore = data.aiScore;
    if (data.aiFeedback !== undefined) updateObj.aiFeedback = data.aiFeedback;
    if (data.feedback !== undefined) updateObj.feedback = data.feedback;
    if (data.calculatedReward !== undefined) updateObj.calculatedReward = data.calculatedReward;
    if (data.penaltyAmount !== undefined) updateObj.penaltyAmount = data.penaltyAmount;
    if (data.status !== undefined) updateObj.status = data.status;
    if (data.tabSwitches !== undefined) updateObj.tabSwitches = data.tabSwitches;
    if (data.pasteCount !== undefined) updateObj.pasteCount = data.pasteCount;
    if (data.submittedAt !== undefined) {
      updateObj.submittedAt = data.submittedAt ? new Date(data.submittedAt) : null;
    }
    if (data.updatedAt !== undefined) {
      updateObj.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    }

    const postgresSubmission = await prisma.submission.update({
      where: { id },
      data: updateObj as any
    });
    res.json({ success: true, submission: postgresSubmission });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Submissions API: Update execution error");
    res.status(500).json({ error: message });
  }
});

// Delete a submission
router.delete("/submissions/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    logger.warn({ id: req.id, submissionId: id }, "Submissions API: Removing submission catalog record");
    await prisma.submission.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Submissions API: Deletion error");
    res.status(500).json({ error: message });
  }
});

// Query submissions list
router.get("/submissions", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit, offset, assignmentId, studentId, status } = req.query;
    const take = limit ? parseInt(limit as string, 10) : 50;
    const skip = offset ? parseInt(offset as string, 10) : 0;
    
    interface SubmissionQueryInput {
      assignmentId?: string;
      studentId?: string;
      status?: string;
    }

    const where: SubmissionQueryInput = {};
    if (assignmentId) where.assignmentId = assignmentId as string;
    if (studentId) where.studentId = studentId as string;
    if (status) where.status = status as string;

    const submissions = await prisma.submission.findMany({
      where: where as any,
      take,
      skip,
      orderBy: { submittedAt: 'desc' }
    });
    res.json(submissions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Submissions API: Listings retrieve error");
    res.status(500).json({ error: message });
  }
});

// Sync submission catalog schema mapping
router.post("/sync/submission", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      id, assignmentId, studentId, content, attachments, aiScore, aiFeedback,
      feedback, calculatedReward, penaltyAmount, status, tabSwitches, pasteCount,
      submittedAt, updatedAt
    } = req.body;
    
    logger.info({ id: req.id, submissionId: id }, "Submissions API: Sync request processing");

    if (!id || !assignmentId || !studentId) {
      return res.status(400).json({ error: "Missing required submission sync constraints" });
    }

    const existing = await prisma.submission.findUnique({ where: { id } });
    
    const upsertPayload = {
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
      submittedAt: submittedAt ? new Date(submittedAt) : null,
      updatedAt: updatedAt ? new Date(updatedAt) : null
    };

    let postgresSubmission;

    if (existing) {
      postgresSubmission = await prisma.submission.update({
        where: { id },
        data: upsertPayload as any
      });
    } else {
      postgresSubmission = await prisma.submission.create({
        data: {
          id,
          ...upsertPayload
        } as any
      });
    }
    
    logger.info({ id: req.id, submissionId: id }, "Submissions API: Synchronization success achieved");
    res.json({ success: true, submission: postgresSubmission });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Submissions API: Sync fault occurred");
    res.status(200).json({ success: false, error: message }); // Keep it 200 so sync failures are non-blocking on front-end
  }
});

export default router;
