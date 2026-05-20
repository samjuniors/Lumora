import { Router, Response } from "express";
import { prisma, logger, AuthenticatedRequest, requireSelfOrAdmin, requireSuperAdmin } from "./shared";
import crypto from "crypto";
import { User } from "@prisma/client";

const router = Router();

// Retrieve a user lookup profile
router.get("/users/:uid", requireSelfOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;
    logger.info({ id: req.id, uid }, "User lookup request initiated");
    const user = await prisma.user.findUnique({
      where: { id: uid }
    });
    if (user) {
      res.json(user);
    } else {
      logger.warn({ id: req.id, uid }, "User not found in Postgres SQL database");
      res.status(404).json({ error: "User not found in SQL database representation" });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Failed reading user profile from Postgres");
    res.status(500).json({ error: message });
  }
});

// Retrieve list of users
router.get("/users", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, limit, offset, email } = req.query;
    
    interface UserWhereInput {
      role?: 'student' | 'admin' | 'superadmin';
      email?: string;
    }
    
    const whereClause: UserWhereInput = {};
    if (role) {
      whereClause.role = role as 'student' | 'admin' | 'superadmin';
    }
    if (email) {
      whereClause.email = email as string;
    }

    const take = limit ? parseInt(limit as string, 10) : 50;
    const skip = offset ? parseInt(offset as string, 10) : 0;

    const users = await prisma.user.findMany({
      where: whereClause as any,
      take,
      skip,
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Failed searching multiple user profiles");
    res.status(500).json({ error: message });
  }
});

// Delete a user (Superadmin restricted)
router.delete("/users/:uid", requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;
    logger.info({ id: req.id, targetUid: uid }, "Superadmin deleting user configuration");
    await prisma.user.delete({
      where: { id: uid }
    });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Failed performing user deletion sequence");
    res.status(500).json({ error: message });
  }
});

// Follow a user
router.post("/users/:uid/follow", requireSelfOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const followerId = req.params.uid;
    const { targetId } = req.body;
    
    if (!targetId) {
      return res.status(400).json({ error: "Missing follow target identifier" });
    }

    await prisma.$transaction(async (tx) => {
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
          read: false,
          createdAt: new Date()
        }
      });
    });
    logger.info({ id: req.id, followerId, targetId }, "Follow relationship successfully bound");
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Follow transaction aborted");
    res.status(500).json({ error: message });
  }
});

// Unfollow a user
router.post("/users/:uid/unfollow", requireSelfOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const followerId = req.params.uid;
    const { targetId } = req.body;
    
    if (!targetId) {
      return res.status(400).json({ error: "Missing unfollow target identifier" });
    }
    
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
    logger.info({ id: req.id, followerId, targetId }, "Follow relationship successfully detached");
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Unfollow transaction aborted");
    res.status(500).json({ error: message });
  }
});

// Update presence state
router.patch("/users/:uid/presence", requireSelfOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.params.uid }, data: { presence: req.body.presence } });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Presence patch transaction failed");
    res.status(500).json({ error: message });
  }
});

// Update user details
router.patch("/users/:uid", requireSelfOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const data = req.body;
    
    logger.info({ id: req.id, targetUid: uid }, "Applying student profile alterations");

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
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.bannerColor !== undefined && { bannerColor: data.bannerColor }),
        ...(data.themeId !== undefined && { themeId: data.themeId }),
        ...(data.syndicateId !== undefined && { syndicateId: data.syndicateId }),
        ...(data.luminaId !== undefined && { luminaId: data.luminaId }),
        ...(data.followingIds !== undefined && { followingIds: data.followingIds }),
        ...(data.followerIds !== undefined && { followerIds: data.followerIds }),
        ...(data.presence !== undefined && { presence: data.presence }),
        
        // Cooldowns / Timestamps
        ...(data.lastRewardClaimedAt !== undefined && { lastRewardClaimedAt: data.lastRewardClaimedAt ? new Date(data.lastRewardClaimedAt) : null }),
        ...(data.lastCollectionAt !== undefined && { lastCollectionAt: data.lastCollectionAt ? new Date(data.lastCollectionAt) : null }),
        ...(data.nextDailyRewardAt !== undefined && { nextDailyRewardAt: data.nextDailyRewardAt ? new Date(data.nextDailyRewardAt) : null }),
        ...(data.nextCollectionAt !== undefined && { nextCollectionAt: data.nextCollectionAt ? new Date(data.nextCollectionAt) : null }),
        ...(data.lastActive !== undefined && { lastActive: data.lastActive ? new Date(data.lastActive) : null }),

        // High-stakes academic parameters
        ...(data.taxWallet !== undefined && { taxWallet: data.taxWallet }),
        ...(data.rechargedCoins !== undefined && { rechargedCoins: data.rechargedCoins }),
        ...(data.inviteCodeUsed !== undefined && { inviteCodeUsed: data.inviteCodeUsed }),
        ...(data.achievements !== undefined && { achievements: data.achievements }),
        ...(data.badgesClaimed !== undefined && { badgesClaimed: data.badgesClaimed }),
        ...(data.inventory !== undefined && { inventory: data.inventory }),
        ...(data.lastMissedSweep !== undefined && { lastMissedSweep: data.lastMissedSweep }),
        ...(data.lastSeenVersion !== undefined && { lastSeenVersion: data.lastSeenVersion }),
        ...(data.lifetimeDiamonds !== undefined && { lifetimeDiamonds: data.lifetimeDiamonds }),
        ...(data.dailyDiamonds !== undefined && { dailyDiamonds: data.dailyDiamonds }),
        ...(data.weeklyDiamonds !== undefined && { weeklyDiamonds: data.weeklyDiamonds }),
        ...(data.lastResetDay !== undefined && { lastResetDay: data.lastResetDay }),
        ...(data.lastResetWeek !== undefined && { lastResetWeek: data.lastResetWeek }),
        ...(data.xpBoosterUntil !== undefined && { xpBoosterUntil: data.xpBoosterUntil }),
        ...(data.vipExp !== undefined && { vipExp: data.vipExp }),
        ...(data.vipLevel !== undefined && { vipLevel: data.vipLevel }),
        ...(data.isOracleUnlocked !== undefined && { isOracleUnlocked: data.isOracleUnlocked }),
        ...(data.taxHavenUntil !== undefined && { taxHavenUntil: data.taxHavenUntil }),
        ...(data.doubleDownShieldUntil !== undefined && { doubleDownShieldUntil: data.doubleDownShieldUntil }),
        ...(data.badgeIds !== undefined && { badgeIds: data.badgeIds }),
        ...(data.totalScore !== undefined && { totalScore: data.totalScore }),
        ...(data.gradedCount !== undefined && { gradedCount: data.gradedCount }),
      }
    });
    res.json({ success: true, user: postgresUser });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Failed applying user metadata edits");
    res.status(500).json({ error: message });
  }
});

// Synchronize profile data with primary storage engine
router.post("/sync/user", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const { uid, email, name, role, coins, diamonds, xp, level, streak } = data;
    logger.info({ id: req.id, uid, email }, "Sync process queued for user session");
    
    if (!uid) {
      logger.error({ id: req.id }, "Sync process aborted: Missing unique ID validation");
      return res.status(400).json({ error: "Missing required sync field: uid" });
    }

    const finalizedEmail = email || `${uid}@placeholder.com`;
    
    const existingEmailOwner = await prisma.user.findUnique({
      where: { email: finalizedEmail }
    });

    if (existingEmailOwner && existingEmailOwner.id !== uid) {
      logger.warn({ id: req.id, obsoleteUid: existingEmailOwner.id, finalizedEmail }, "Collision detected. Removing obsolete entity.");
      await prisma.user.delete({ where: { email: finalizedEmail } });
    }

    const postgresUser = await prisma.user.upsert({
      where: { id: uid },
      update: {
        email: finalizedEmail,
        name: name || '',
        role: role as any || 'student',
        ...(coins !== undefined && { coins }),
        ...(diamonds !== undefined && { diamonds }),
        ...(xp !== undefined && { xp }),
        ...(level !== undefined && { level }),
        ...(streak !== undefined && { streak }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(data.theme !== undefined && { theme: data.theme }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.bannerColor !== undefined && { bannerColor: data.bannerColor }),
        ...(data.themeId !== undefined && { themeId: data.themeId }),
        ...(data.syndicateId !== undefined && { syndicateId: data.syndicateId }),
        ...(data.luminaId !== undefined && { luminaId: data.luminaId }),
        ...(data.followingIds !== undefined && { followingIds: data.followingIds }),
        ...(data.followerIds !== undefined && { followerIds: data.followerIds }),
        ...(data.presence !== undefined && { presence: data.presence }),

        // Cooldowns / Timestamps
        ...(data.lastRewardClaimedAt !== undefined && { lastRewardClaimedAt: data.lastRewardClaimedAt ? new Date(data.lastRewardClaimedAt) : null }),
        ...(data.lastCollectionAt !== undefined && { lastCollectionAt: data.lastCollectionAt ? new Date(data.lastCollectionAt) : null }),
        ...(data.nextDailyRewardAt !== undefined && { nextDailyRewardAt: data.nextDailyRewardAt ? new Date(data.nextDailyRewardAt) : null }),
        ...(data.nextCollectionAt !== undefined && { nextCollectionAt: data.nextCollectionAt ? new Date(data.nextCollectionAt) : null }),
        ...(data.lastActive !== undefined && { lastActive: data.lastActive ? new Date(data.lastActive) : null }),

        // Additional state parameters 
        ...(data.taxWallet !== undefined && { taxWallet: data.taxWallet }),
        ...(data.rechargedCoins !== undefined && { rechargedCoins: data.rechargedCoins }),
        ...(data.inviteCodeUsed !== undefined && { inviteCodeUsed: data.inviteCodeUsed }),
        ...(data.achievements !== undefined && { achievements: data.achievements }),
        ...(data.badgesClaimed !== undefined && { badgesClaimed: data.badgesClaimed }),
        ...(data.inventory !== undefined && { inventory: data.inventory }),
        ...(data.lastMissedSweep !== undefined && { lastMissedSweep: data.lastMissedSweep }),
        ...(data.lastSeenVersion !== undefined && { lastSeenVersion: data.lastSeenVersion }),
        ...(data.lifetimeDiamonds !== undefined && { lifetimeDiamonds: data.lifetimeDiamonds }),
        ...(data.dailyDiamonds !== undefined && { dailyDiamonds: data.dailyDiamonds }),
        ...(data.weeklyDiamonds !== undefined && { weeklyDiamonds: data.weeklyDiamonds }),
        ...(data.lastResetDay !== undefined && { lastResetDay: data.lastResetDay }),
        ...(data.lastResetWeek !== undefined && { lastResetWeek: data.lastResetWeek }),
        ...(data.xpBoosterUntil !== undefined && { xpBoosterUntil: data.xpBoosterUntil }),
        ...(data.vipExp !== undefined && { vipExp: data.vipExp }),
        ...(data.vipLevel !== undefined && { vipLevel: data.vipLevel }),
        ...(data.isOracleUnlocked !== undefined && { isOracleUnlocked: data.isOracleUnlocked }),
        ...(data.taxHavenUntil !== undefined && { taxHavenUntil: data.taxHavenUntil }),
        ...(data.doubleDownShieldUntil !== undefined && { doubleDownShieldUntil: data.doubleDownShieldUntil }),
        ...(data.badgeIds !== undefined && { badgeIds: data.badgeIds }),
        ...(data.totalScore !== undefined && { totalScore: data.totalScore }),
        ...(data.gradedCount !== undefined && { gradedCount: data.gradedCount }),
      },
      create: {
        id: uid,
        email: finalizedEmail,
        name: name || '',
        role: role as any || 'student',
        coins: coins ?? 0,
        diamonds: diamonds ?? 10,
        xp: xp ?? 0,
        level: level ?? 1,
        streak: streak ?? 0,
        avatar: data.avatar || null,
        theme: data.theme || null,
        bio: data.bio || null,
        bannerColor: data.bannerColor || null,
        themeId: data.themeId || null,
        syndicateId: data.syndicateId || null,
        luminaId: data.luminaId || null,
        followingIds: data.followingIds || [],
        followerIds: data.followerIds || [],
        presence: data.presence || 'offline',

        // Cooldowns / Timestamps
        lastRewardClaimedAt: data.lastRewardClaimedAt ? new Date(data.lastRewardClaimedAt) : null,
        lastCollectionAt: data.lastCollectionAt ? new Date(data.lastCollectionAt) : null,
        nextDailyRewardAt: data.nextDailyRewardAt ? new Date(data.nextDailyRewardAt) : null,
        nextCollectionAt: data.nextCollectionAt ? new Date(data.nextCollectionAt) : null,
        lastActive: data.lastActive ? new Date(data.lastActive) : null,

        // Additional state parameters
        taxWallet: data.taxWallet ?? 0,
        rechargedCoins: data.rechargedCoins ?? 0,
        inviteCodeUsed: data.inviteCodeUsed || null,
        achievements: data.achievements || [],
        badgesClaimed: data.badgesClaimed || [],
        inventory: data.inventory || [],
        lastMissedSweep: data.lastMissedSweep || null,
        lastSeenVersion: data.lastSeenVersion || null,
        lifetimeDiamonds: data.lifetimeDiamonds ?? 0,
        dailyDiamonds: data.dailyDiamonds ?? 0,
        weeklyDiamonds: data.weeklyDiamonds ?? 0,
        lastResetDay: data.lastResetDay || null,
        lastResetWeek: data.lastResetWeek || null,
        xpBoosterUntil: data.xpBoosterUntil || null,
        vipExp: data.vipExp ?? 0,
        vipLevel: data.vipLevel ?? 0,
        isOracleUnlocked: data.isOracleUnlocked ?? false,
        taxHavenUntil: data.taxHavenUntil || null,
        doubleDownShieldUntil: data.doubleDownShieldUntil || null,
        badgeIds: data.badgeIds || [],
        totalScore: data.totalScore ?? 0,
        gradedCount: data.gradedCount ?? 0,
      }
    });
    
    logger.info({ id: req.id, uid }, "User sync completed successfully");
    res.json({ success: true, user: postgresUser });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "User sync system faulted");
    res.status(200).json({ success: false, error: message });
  }
});

// Retrieve user achievement milestones progress metrics
router.get("/users/:uid/achievement-progress", async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Milestones metrics calculation faulted");
    res.status(500).json({ error: message });
  }
});

export default router;
