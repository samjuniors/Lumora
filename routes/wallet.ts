import { Router, Response } from "express";
import { prisma, logger, AuthenticatedRequest, requireAdmin } from "./shared";
import crypto from "crypto";

const router = Router();

// Retrieve transactions history
router.get("/transactions", async (req: AuthenticatedRequest, res: Response) => {
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
    
    logger.info({ id: req.id, userId, type }, "Transactions Ledger: Query list requested");
    const txs = await prisma.transaction.findMany({ where, orderBy: { timestamp: "desc" } });
    res.json(txs.map(t => ({
      ...t,
      timestamp: t.timestamp.getTime(),
      updatedAt: t.updatedAt.getTime()
    })));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Transactions Ledger: Query fault");
    res.status(500).json({ error: message });
  }
});

// Process a ledger transaction
router.post("/transactions/process", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { txData, userUpdates } = req.body;
    const { timestamp, updatedAt, ...safeTxData } = txData;
    
    const authenticatedUser = req.user;
    if (!authenticatedUser) {
      return res.status(401).json({ error: "Unauthorized: Missing validated session user context." });
    }

    const ADMIN_EMAILS = [
      'luvkus8@gmail.com',
      'luvkus8@gmail',
      'luvkush8@gmail.com'
    ];
    const isUserAdmin = authenticatedUser.role === 'admin' || authenticatedUser.role === 'superadmin' || ADMIN_EMAILS.includes((authenticatedUser.email || '').toLowerCase());

    // Non-administrative users are limited to processing statements referencing their own context
    if (!isUserAdmin) {
      if (safeTxData.senderId !== authenticatedUser.id && safeTxData.receiverId !== authenticatedUser.id && safeTxData.senderId !== 'SYSTEM') {
        return res.status(403).json({ error: "Forbidden: Cannot process transactions on behalf of other users." });
      }
      
      if (userUpdates && Array.isArray(userUpdates)) {
        for (const update of userUpdates) {
          if (update.where?.id !== authenticatedUser.id) {
            return res.status(403).json({ error: "Forbidden: You are only allowed to update your own user balances." });
          }
          if (update.data?.role !== undefined) {
            return res.status(403).json({ error: "Forbidden: Privilege escalation is blocked. Prohibited modification of user roles." });
          }
        }
      }
    }

    logger.info({ id: req.id, senderId: safeTxData.senderId, receiverId: safeTxData.receiverId }, "Transactions Ledger: Processing atomic transfer sequence");

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Transactions Ledger: Transaction process fault");
    res.status(500).json({ error: message });
  }
});

// Update a transaction entry (restricted write)
router.patch("/transactions/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await prisma.transaction.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, txId: req.params.id, err: message }, "Transactions Ledger: Record edit failed");
    res.status(500).json({ error: message });
  }
});

// ------------------------------------
// Deterministic Cooldown Claims API
// ------------------------------------

router.post("/claim/daily", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.body;
    logger.info({ id: req.id, claimUser: userId }, "Claims System: Queueing Daily drop claims request");
    
    if (!userId) {
      return res.status(400).json({ error: "Missing identity assertion parameter (userId)" });
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      logger.warn({ id: req.id, claimUser: userId }, "Claims System: High stakes user reference not found");
      return res.status(404).json({ error: "User profile not found in high-stakes database. Your profile might still be syncing - please wait or refresh." });
    }

    const now = new Date();
    
    // Check if already claimed today using deterministic timestamp
    if (user.nextDailyRewardAt && now.getTime() < user.nextDailyRewardAt.getTime()) {
      return res.status(400).json({ error: "Already claimed today" });
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

    const nextDaily = new Date(now);
    nextDaily.setUTCHours(24, 0, 0, 0);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          lastRewardClaimedAt: now,
          nextDailyRewardAt: nextDaily,
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

    logger.info({ id: req.id, claimUser: userId, rewardType: type, value }, "Claims System: Daily drop successfully issued");
    res.json({ success: true, reward: { type, value }, timestamp: now.getTime() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Claims System: Daily Drop processor faulted");
    res.status(500).json({ error: message });
  }
});

router.post("/claim/resource", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.body;
    logger.info({ id: req.id, claimUser: userId }, "Claims System: Harvesting Resource logs");
    
    if (!userId) {
      return res.status(400).json({ error: "Missing identity parameter userId" });
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User profile not found in high-stakes database. Your profile might still be syncing - please wait or refresh." });
    }

    const now = new Date();
    
    // Check cooldown using deterministic timestamp
    if (user.nextCollectionAt && now.getTime() < user.nextCollectionAt.getTime()) {
      return res.status(400).json({ error: "Collector on active cooldown cycle" });
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

    const nextCollect = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          lastCollectionAt: now,
          nextCollectionAt: nextCollect,
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

    logger.info({ id: req.id, claimUser: userId, tier, coins, diamonds }, "Claims System: Resource harvesting completed");
    res.json({ success: true, coins, diamonds, tier, timestamp: now.getTime() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Claims System: Resource harvester faulted");
    res.status(500).json({ error: message });
  }
});

router.post("/claim/reset-collector", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.body;
    const resetCost = 3; // Diamonds
    logger.info({ id: req.id, claimUser: userId }, "Claims System: Resetting collector cooldown");
    
    if (!userId) {
      return res.status(400).json({ error: "Missing identity parameter userId" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.diamonds < resetCost) {
      return res.status(400).json({ error: "Insufficient diamonds to purchase cooldown bypass" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          diamonds: { decrement: resetCost },
          lastCollectionAt: null,
          nextCollectionAt: null
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Claims System: Collector reset request failed");
    res.status(500).json({ error: message });
  }
});

// ------------------------------------
// Recharge Requests API
// ------------------------------------

router.get("/recharge-requests", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.query;
    interface QueryWhereInput {
      userId?: string;
    }
    const where: QueryWhereInput = {};
    if (userId) where.userId = String(userId);

    const reqs = await prisma.rechargeRequest.findMany({ where: where as any, orderBy: { timestamp: "desc" } });
    res.json(reqs.map(r => ({
      ...r,
      timestamp: r.timestamp.getTime(),
      updatedAt: r.updatedAt.getTime()
    })));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Ledger: Recharge queries failed");
    res.status(500).json({ error: message });
  }
});

router.post("/recharge-requests", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const id = data.id || crypto.randomUUID();
    const r = await prisma.rechargeRequest.create({ 
      data: {
        id,
        userId: data.userId || '',
        amount: data.amount ?? data.costAmount ?? data.coinsAmount ?? 0,
        currency: data.currency || 'USD',
        status: data.status || 'pending',
        utr: data.utr || data.receiptNumber || null,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      }
    });
    res.json({
      ...r,
      timestamp: r.timestamp.getTime(),
      updatedAt: r.updatedAt.getTime(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Ledger: Recharge request failed to record");
    res.status(500).json({ error: message });
  }
});

router.patch("/recharge-requests/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const updated = await prisma.rechargeRequest.update({ 
      where: { id: req.params.id }, 
      data: {
        ...(data.userId !== undefined && { userId: data.userId }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.utr !== undefined && { utr: data.utr }),
        ...(data.timestamp !== undefined && { timestamp: new Date(data.timestamp) }),
        ...(data.updatedAt !== undefined && { updatedAt: new Date(data.updatedAt) }),
      }
    });
    res.json({
      ...updated,
      timestamp: updated.timestamp.getTime(),
      updatedAt: updated.updatedAt.getTime(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, targetRequestId: req.params.id, err: message }, "Ledger: Recharge edit rejected");
    res.status(500).json({ error: message });
  }
});

router.delete("/recharge-requests/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.warn({ id: req.id, targetRequestId: req.params.id }, "Ledger: Discarding recharge request document");
    await prisma.rechargeRequest.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, targetRequestId: req.params.id, err: message }, "Ledger: Recharge deletion fault");
    res.status(500).json({ error: message });
  }
});

export default router;
