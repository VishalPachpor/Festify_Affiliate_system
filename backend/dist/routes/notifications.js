"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.notificationsRouter = router;
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications
//
// Lightweight notification feed. Returns the most recent notifications for
// the requesting recipient. The recipient is identified by:
//   1. affiliateId from JWT → affiliate inbox
//   2. otherwise            → tenant-wide ("*") inbox for the organizer
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/notifications", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const recipientId = req.affiliateId ?? "*";
        const notifications = await prisma_1.prisma.notification.findMany({
            where: { tenantId, recipientId },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        res.status(200).json({
            notifications: notifications.map((n) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                readAt: n.readAt?.toISOString() ?? null,
                createdAt: n.createdAt.toISOString(),
            })),
        });
    }
    catch (err) {
        console.error("[notifications] list failed:", err);
        res.status(500).json({ error: "Failed to load notifications" });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/read-all
//
// Marks every unread notification for the requesting recipient as read.
// Used by the bell dropdown when the user opens the panel — the badge clears
// without needing per-row mark-read endpoints (overkill for this MVP).
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/api/notifications/read-all", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const recipientId = req.affiliateId ?? "*";
        const { count } = await prisma_1.prisma.notification.updateMany({
            where: { tenantId, recipientId, readAt: null },
            data: { readAt: new Date() },
        });
        res.status(200).json({ updated: count });
    }
    catch (err) {
        console.error("[notifications] mark-all-read failed:", err);
        res.status(500).json({ error: "Failed to mark notifications as read" });
    }
});
//# sourceMappingURL=notifications.js.map