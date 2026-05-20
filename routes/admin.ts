import { Router, Response } from "express";
import { prisma, logger, AuthenticatedRequest, requireAdmin, requireSuperAdmin, requireAuth } from "./shared";
import crypto from "crypto";

const router = Router();

// ------------------------------------
// Invite Codes API
// ------------------------------------

router.get("/invite-codes", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.query;
    logger.info({ id: req.id, code }, "Invite Codes: Query requested");
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Invite Codes: Query list fault");
    res.status(500).json({ error: message });
  }
});

router.post("/invite-codes", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { createdAt, updatedAt, ...data } = req.body;
    logger.info({ id: req.id, code: data.code }, "Invite Codes: Generating new code");
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Invite Codes: Generation failed");
    res.status(500).json({ error: message });
  }
});

router.patch("/invite-codes/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info({ id: req.id, targetId: req.params.id }, "Invite Codes: Patch request received");
    const updated = await prisma.inviteCode.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, targetId: req.params.id, err: message }, "Invite Codes: Patch failed");
    res.status(500).json({ error: message });
  }
});

router.delete("/invite-codes/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.warn({ id: req.id, targetId: req.params.id }, "Invite Codes: Removing invite code from registry");
    await prisma.inviteCode.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, targetId: req.params.id, err: message }, "Invite Codes: Deletion faulted");
    res.status(500).json({ error: message });
  }
});

// ------------------------------------
// Global Platform System Settings API
// ------------------------------------

router.get("/settings", async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info({ id: req.id }, "Platform Settings: Query requested");
    let settings = await prisma.settings.findUnique({ where: { id: "global" } });
    if (!settings) settings = await prisma.settings.create({ data: { id: "global" } });
    res.json({
      ...settings,
      updatedAt: settings.updatedAt.getTime()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Platform Settings: Query failed");
    res.status(500).json({ error: message });
  }
});

router.patch("/settings", requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.warn({ id: req.id }, "Platform Settings: Superadmin updating global administrative parameters");
    const updated = await prisma.settings.upsert({ 
      where: { id: "global" }, 
      update: req.body, 
      create: { id: "global", ...req.body } 
    });
    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Platform Settings: Patch aborted");
    res.status(500).json({ error: message });
  }
});

// ------------------------------------
// Missions Enrollments API
// ------------------------------------

router.get("/enrollments", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId, assignmentId } = req.query;
    interface EnrollmentsWhereInput {
      studentId?: string;
      assignmentId?: string;
    }
    const where: EnrollmentsWhereInput = {};
    if (studentId) where.studentId = String(studentId);
    if (assignmentId) where.assignmentId = String(assignmentId);
    
    logger.info({ id: req.id, studentId, assignmentId }, "Enrollments API: Fetch requested");
    const enrollments = await prisma.enrollment.findMany({ where: where as any });
    res.json(enrollments.map(e => ({
      ...e,
      enrolledAt: e.enrolledAt.getTime(),
      updatedAt: e.updatedAt.getTime(),
      graceDeadline: e.graceDeadline ? e.graceDeadline.getTime() : undefined
    })));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Enrollments API: Fetch lists faulted");
    res.status(500).json({ error: message });
  }
});

router.post("/enrollments", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enrolledAt, updatedAt, graceDeadline, ...data } = req.body;
    logger.info({ id: req.id, studentId: data.studentId, assignmentId: data.assignmentId }, "Enrollments API: Linking enrollment record");
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Enrollments API: Enrollment insertion failed");
    res.status(500).json({ error: message });
  }
});

router.patch("/enrollments/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enrolledAt, updatedAt, graceDeadline, ...data } = req.body;
    logger.info({ id: req.id, targetId: req.params.id }, "Enrollments API: Modifying enrollment states");
    const updated = await prisma.enrollment.update({ 
      where: { id: req.params.id }, 
      data: {
        ...data,
        enrolledAt: enrolledAt ? new Date(enrolledAt) : undefined,
        graceDeadline: graceDeadline ? new Date(graceDeadline) : undefined,
      } 
    });
    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, targetId: req.params.id, err: message }, "Enrollments API: Modify request failed");
    res.status(500).json({ error: message });
  }
});

router.delete("/enrollments/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.warn({ id: req.id, targetId: req.params.id }, "Enrollments API: Dismissing student from enrollment record");
    await prisma.enrollment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, targetId: req.params.id, err: message }, "Enrollments API: Dismissal completed with errors");
    res.status(500).json({ error: message });
  }
});

// ------------------------------------
// Syndicates API
// ------------------------------------

router.get("/syndicates", async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info({ id: req.id }, "Syndicates API: Retrieval requested");
    const syndicates = await prisma.syndicate.findMany({ orderBy: { totalScore: "desc" } });
    res.json(syndicates);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Syndicates API: Fetch failure");
    res.status(500).json({ error: message });
  }
});

router.post("/syndicates", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const id = data.id || crypto.randomUUID();
    logger.info({ id: req.id, syndicateId: id }, "Syndicates API: Establishing team alliance");
    const s = await prisma.syndicate.create({ 
      data: {
        id,
        name: data.name || '',
        description: data.description || '',
        tag: data.tag || '',
        leaderId: data.leaderId || '',
        memberIds: data.memberIds || [],
        totalScore: data.totalScore || 0,
        coinsStaked: data.coinsStaked || 0,
        logo: data.logo || null,
        level: data.level || 1,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
      }
    });
    res.json(s);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Syndicates API: Team registration failure");
    res.status(500).json({ error: message });
  }
});

router.get("/syndicates/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info({ id: req.id, syndicateId: req.params.id }, "Syndicates API: Alliance lookup requested");
    const s = await prisma.syndicate.findUnique({ where: { id: req.params.id } });
    if (!s) return res.status(404).json({ error: "Syndicate not found in platform systems" });
    res.json(s);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, syndicateId: req.params.id, err: message }, "Syndicates API: Lookup fault");
    res.status(500).json({ error: message });
  }
});

router.patch("/syndicates/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, ...data } = req.body;
    logger.info({ id: req.id, syndicateId: req.params.id }, "Syndicates API: Re-aligning team attributes");
    const updated = await prisma.syndicate.update({ 
      where: { id: req.params.id }, 
      data: {
         ...(data.name !== undefined && { name: data.name }),
         ...(data.description !== undefined && { description: data.description }),
         ...(data.tag !== undefined && { tag: data.tag }),
         ...(data.leaderId !== undefined && { leaderId: data.leaderId }),
         ...(data.memberIds !== undefined && { memberIds: data.memberIds }),
         ...(data.totalScore !== undefined && { totalScore: data.totalScore }),
         ...(data.coinsStaked !== undefined && { coinsStaked: data.coinsStaked }),
         ...(data.logo !== undefined && { logo: data.logo }),
         ...(data.level !== undefined && { level: data.level }),
         ...(data.createdAt !== undefined && { createdAt: data.createdAt }),
         ...(data.updatedAt !== undefined && { updatedAt: data.updatedAt }),
      }
    });
    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, syndicateId: req.params.id, err: message }, "Syndicates API: Alignments modification rejected");
    res.status(500).json({ error: message });
  }
});

router.delete("/syndicates/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.warn({ id: req.id, syndicateId: req.params.id }, "Syndicates API: Dissolving team alliance permanently");
    await prisma.syndicate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, syndicateId: req.params.id, err: message }, "Syndicates API: Alliance deletion failure");
    res.status(500).json({ error: message });
  }
});

// ------------------------------------
// Pre-Registration API
// ------------------------------------

router.get("/pre-registered", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email } = req.query;
    logger.info({ id: req.id, email }, "Pre-registration: Fetch list requested");
    if (email) {
      const u = await prisma.preRegisteredUser.findUnique({ where: { email: String(email) } });
      return res.json(u ? [u] : []);
    }
    const users = await prisma.preRegisteredUser.findMany({ orderBy: { createdAt: "desc" } });
    res.json(users);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Pre-registration: Query lists fault");
    res.status(500).json({ error: message });
  }
});

router.post("/pre-registered", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, createdAt, updatedAt, claimedAt, ...data } = req.body;
    logger.info({ id: req.id, email: data.email }, "Pre-registration: Record signup whitelist");
    const u = await prisma.preRegisteredUser.upsert({
      where: { email: data.email },
      update: data,
      create: {
        ...data,
        id: id || crypto.randomUUID(),
      }
    });
    res.json(u);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Pre-registration: Direct whitelist insertion failed");
    res.status(500).json({ error: message });
  }
});

router.patch("/pre-registered/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, createdAt, updatedAt, claimedAt, ...data } = req.body;
    logger.info({ id: req.id, targetId: req.params.id }, "Pre-registration: Whitelist state updated");
    const u = await prisma.preRegisteredUser.update({
      where: { id: req.params.id },
      data: {
        ...data,
        claimedAt: claimedAt ? new Date(claimedAt) : undefined
      }
    });
    res.json(u);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, targetId: req.params.id, err: message }, "Pre-registration: Modification failed");
    res.status(500).json({ error: message });
  }
});

router.delete("/pre-registered/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.warn({ id: req.id, targetId: req.params.id }, "Pre-registration: Revoking whitelist membership");
    await prisma.preRegisteredUser.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, targetId: req.params.id, err: message }, "Pre-registration: Member expulsion failure");
    res.status(500).json({ error: message });
  }
});

// ------------------------------------
// Maintenance & Automatic Penalty Sweep
// ------------------------------------

router.post("/maintenance/penalty-sweep", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assignmentId } = req.body;
    const now = new Date();
    
    logger.info({ id: req.id, targetAssignmentId: assignmentId }, "Deadline Enforcer: Launching global sweep cycle");

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
               type: 'alert',
               createdAt: new Date()
             }
           });
        }
      }
      return { penalizedCount };
    });
    
    logger.info({ id: req.id, penalizedCount: result.penalizedCount }, "Deadline Enforcer: Sweep cycle completed successfully");
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Deadline Enforcer: Sweep cycle execution faulted");
    res.status(500).json({ error: message });
  }
});

export default router;
