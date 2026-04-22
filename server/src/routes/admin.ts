import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

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
