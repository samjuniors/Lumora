import { Router, Response } from "express";
import { prisma, logger, AuthenticatedRequest, requireAdmin } from "./shared";
import crypto from "crypto";

const router = Router();

// Retrieve target assignment details
router.get("/assignments/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    logger.info({ id: req.id, assignmentId: id }, "Assignments API: Lookup requested");
    const assignment = await prisma.assignment.findUnique({
      where: { id }
    });
    if (assignment) {
      res.json(assignment);
    } else {
      res.status(404).json({ error: "Assignment not found in SQL database representation" });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Assignments API: Lookup error");
    res.status(500).json({ error: message });
  }
});

// Update assignment properties (Admin restricted)
router.patch("/assignments/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    logger.info({ id: req.id, assignmentId: id }, "Assignments API: Attempting revision of mission data");
    
    const postgresAssignment = await prisma.assignment.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.instructions !== undefined && { instructions: data.instructions }),
        ...(data.rubric !== undefined && { rubric: data.rubric as any }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.frequency !== undefined && { frequency: data.frequency }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.timeLimitMinutes !== undefined && { timeLimitMinutes: data.timeLimitMinutes }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.entryFee !== undefined && { entryFee: data.entryFee }),
        ...(data.bonusReward !== undefined && { bonusReward: data.bonusReward }),
        ...(data.penaltyFee !== undefined && { penaltyFee: data.penaltyFee }),
        ...(data.xpReward !== undefined && { xpReward: data.xpReward }),
        ...(data.isBonus !== undefined && { isBonus: data.isBonus }),
        ...(data.isDuoBonus !== undefined && { isDuoBonus: data.isDuoBonus }),
        ...(data.duoId !== undefined && { duoId: data.duoId }),
        ...(data.bonusType !== undefined && { bonusType: data.bonusType }),
        ...(data.missionNumber !== undefined && { missionNumber: data.missionNumber }),
        ...(data.allowedStudents !== undefined && { allowedStudents: data.allowedStudents }),
        ...(data.isGlobal !== undefined && { isGlobal: data.isGlobal }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.campaignId !== undefined && { campaignId: data.campaignId }),
        ...(data.creatorId !== undefined && { creatorId: data.creatorId }),
        ...(data.gradedCount !== undefined && { gradedCount: data.gradedCount }),
        ...(data.totalScore !== undefined && { totalScore: data.totalScore }),
        ...(data.createdAt !== undefined && { createdAt: data.createdAt }),
        ...(data.updatedAt !== undefined && { updatedAt: data.updatedAt })
      }
    });
    res.json({ success: true, assignment: postgresAssignment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Assignments API: Revision error");
    res.status(500).json({ error: message });
  }
});

// Delete assignment (Admin restricted)
router.delete("/assignments/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    logger.warn({ id: req.id, assignmentId: id }, "Assignments API: Deleting assignment reference");
    await prisma.assignment.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Assignments API: Deletion error");
    res.status(500).json({ error: message });
  }
});

// Query all assignments
router.get("/assignments", async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Assignments API: Query list error");
    res.status(500).json({ error: message });
  }
});

// Sync assignment properties
router.post("/sync/assignment", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const { id } = data;
    logger.info({ id: req.id, assignmentId: id }, "Assignments API: Sync requested");
    
    if (!id) {
      return res.status(400).json({ error: "Missing assignment id" });
    }

    const existing = await prisma.assignment.findUnique({ where: { id } });

    let postgresAssignment;
    
    const upsertData = {
        title: data.title || '',
        description: data.description || '',
        instructions: data.instructions || '',
        rubric: data.rubric as any || null,
        subject: data.subject || null,
        frequency: data.frequency || null,
        startDate: data.startDate || null,
        timeLimitMinutes: data.timeLimitMinutes || null,
        dueDate: data.dueDate || 0,
        entryFee: data.entryFee || 0,
        bonusReward: data.bonusReward || 0,
        penaltyFee: data.penaltyFee || 0,
        xpReward: data.xpReward || 0,
        isBonus: data.isBonus || false,
        isDuoBonus: data.isDuoBonus || false,
        duoId: data.duoId || null,
        bonusType: data.bonusType || null,
        missionNumber: data.missionNumber || null,
        allowedStudents: data.allowedStudents || [],
        isGlobal: data.isGlobal || false,
        status: data.status || 'draft',
        campaignId: data.campaignId || null,
        creatorId: data.creatorId || 'admin',
        gradedCount: data.gradedCount || 0,
        totalScore: data.totalScore || 0,
        createdAt: data.createdAt || 0,
        updatedAt: data.updatedAt || 0,
    };

    if (existing) {
      postgresAssignment = await prisma.assignment.update({
        where: { id },
        data: upsertData
      });
    } else {
      postgresAssignment = await prisma.assignment.create({
        data: { id, ...upsertData }
      });
    }
    
    logger.info({ id: req.id, assignmentId: id }, "Assignments API: Sync completed successfully");
    res.json({ success: true, assignment: postgresAssignment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Assignments API: Sync fault captured");
    res.status(200).json({ success: false, error: message });
  }
});

// ------------------------------------
// Assignment Templates API
// ------------------------------------

router.get("/assignment-templates", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templates = await prisma.assignmentTemplate.findMany({ orderBy: { createdAt: "desc" } });
    res.json(templates);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Templates API: Get templates failed");
    res.status(500).json({ error: message });
  }
});

router.post("/assignment-templates", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const id = data.id || crypto.randomUUID();
    logger.info({ id: req.id, templateId: id }, "Templates API: Creating new assignment template");
    const template = await prisma.assignmentTemplate.create({ 
      data: {
        id,
        label: data.label || '',
        title: data.title || '',
        subject: data.subject || '',
        description: data.description || '',
        instructions: data.instructions || '',
        timeLimitMinutes: data.timeLimitMinutes || 0,
        rubric: data.rubric || null,
        creatorId: data.creatorId || null,
        createdAt: data.createdAt || Date.now(),
      }
    });
    res.json(template);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Templates API: Template insertion failed");
    res.status(500).json({ error: message });
  }
});

router.patch("/assignment-templates/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, ...data } = req.body;
    logger.info({ id: req.id, templateId: req.params.id }, "Templates API: Patch template requested");
    const updated = await prisma.assignmentTemplate.update({ 
      where: { id: req.params.id }, 
      data: {
        ...(data.label !== undefined && { label: data.label }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.instructions !== undefined && { instructions: data.instructions }),
        ...(data.timeLimitMinutes !== undefined && { timeLimitMinutes: data.timeLimitMinutes }),
        ...(data.rubric !== undefined && { rubric: data.rubric }),
        ...(data.creatorId !== undefined && { creatorId: data.creatorId }),
        ...(data.createdAt !== undefined && { createdAt: data.createdAt }),
      }
    });
    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Templates API: Template update failed");
    res.status(500).json({ error: message });
  }
});

router.delete("/assignment-templates/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.warn({ id: req.id, templateId: req.params.id }, "Templates API: Deleting template record");
    await prisma.assignmentTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Templates API: Template removal failed");
    res.status(500).json({ error: message });
  }
});

export default router;
