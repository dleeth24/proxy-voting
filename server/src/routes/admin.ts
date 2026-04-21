import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /admin/proxy-holders
router.get('/proxy-holders', requireAuth, requireAdmin, async (_req, res) => {
  const holders = await prisma.approvedProxyHolder.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      addedBy: { select: { name: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });
  res.json(holders);
});

// POST /admin/proxy-holders { userId }
router.post('/proxy-holders', requireAuth, requireAdmin, async (req, res) => {
  const { userId } = req.body;

  // Check user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const holder = await prisma.approvedProxyHolder.create({
    data: { userId, addedById: req.user!.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  await prisma.auditLog.create({
    data: { action: 'PROXY_HOLDER_ADDED', actorId: req.user!.id, targetId: userId },
  });

  res.status(201).json(holder);
});

// DELETE /admin/proxy-holders/:userId
router.delete('/proxy-holders/:userId', requireAuth, requireAdmin, async (req, res) => {
  await prisma.approvedProxyHolder.delete({ where: { userId: req.params.userId } });

  await prisma.auditLog.create({
    data: { action: 'PROXY_HOLDER_REMOVED', actorId: req.user!.id, targetId: req.params.userId },
  });

  res.json({ ok: true });
});

// GET /admin/audit-log
router.get('/audit-log', requireAuth, requireAdmin, async (req, res) => {
  const { page = '1', limit = '50', ballotId, actorId, action } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: Record<string, unknown> = {};
  if (ballotId) where.ballotId = ballotId;
  if (actorId) where.actorId = actorId;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { name: true, email: true } },
        ballot: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, total, page: parseInt(page as string), limit: parseInt(limit as string) });
});

// GET /admin/ballots/:id/audit
router.get('/ballots/:id/audit', requireAuth, requireAdmin, async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    where: { ballotId: req.params.id },
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(logs);
});

export default router;
