import { Router, Response } from "express";
import { prisma, logger, AuthenticatedRequest, configureWebPush } from "./shared";
import webpush from "web-push";
import crypto from "crypto";

const router = Router();

// Retrieve in-app notifications
router.get("/notifications", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.json([]);
    
    logger.info({ id: req.id, userId }, "Notifications API: Query logs requested");
    const notifications = await prisma.notification.findMany({ 
      where: { userId: String(userId) }, 
      orderBy: { createdAt: "desc" } 
    });
    
    res.json(notifications.map(n => ({
      ...n,
      createdAt: n.createdAt.getTime(),
      read: n.read === true
    })));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Notifications API: Read fault");
    res.status(500).json({ error: message });
  }
});

// Insert a new notification
router.post("/notifications", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { createdAt, ...data } = req.body;
    logger.info({ id: req.id, userId: data.userId }, "Notifications API: Direct insertion initiated");
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Notifications API: Insertion failure");
    res.status(500).json({ error: message });
  }
});

// Update a notification read/unread state
router.patch("/notifications/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info({ id: req.id, notificationId: req.params.id }, "Notifications API: Presence update requested");
    const updated = await prisma.notification.update({ 
      where: { id: req.params.id }, 
      data: req.body 
    });
    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, notificationId: req.params.id, err: message }, "Notifications API: Presence update failure");
    res.status(500).json({ error: message });
  }
});

// Delete a notification record
router.delete("/notifications/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.warn({ id: req.id, notificationId: req.params.id }, "Notifications API: Deleting history item");
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, notificationId: req.params.id, err: message }, "Notifications API: Deletion fault");
    res.status(500).json({ error: message });
  }
});

// Push Web Notification subscription
router.post("/push/subscribe", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subscription, userId } = req.body;
    const actualSub = subscription || req.body;
    const endpoint = actualSub?.endpoint;
    const keys = actualSub?.keys;
    
    if (!endpoint || !keys) {
      return res.status(400).json({ error: "Missing subscription endpoint or keys configuration properties" });
    }

    logger.info({ id: req.id, userId, endpoint }, "Push API: Subscription handshake initiated");
    
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: userId || 'anonymous',
        keys: keys as any,
      },
      create: {
        id: crypto.randomUUID(),
        userId: userId || 'anonymous',
        endpoint,
        keys: keys as any,
      }
    });

    res.status(201).json({ status: 'subscribed' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Push API: Subscription failed to record");
    res.status(500).json({ error: "Failed to process push subscriptions cataloging" });
  }
});

// Dispatch Web Notification payload
router.post("/push/send", async (req: AuthenticatedRequest, res: Response) => {
  const { subscription, payload } = req.body;
  try {
    logger.info({ id: req.id }, "Push API: Dispatching push notification packet");
    configureWebPush();
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    res.status(200).json({ status: 'sent' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ id: req.id, err: message }, "Push API: Dispatching failure");
    res.status(500).json({ error: "Failed to transmit push notification packet" });
  }
});

export default router;
