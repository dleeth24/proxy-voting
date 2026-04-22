import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /users — admin: all users
router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      standingProxy: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(users);
});

// GET /users/me
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      standingProxy: { select: { id: true, name: true } },
    },
  });
  res.json(user);
});

// GET /users/partners — all partners (for proxy selection)
router.get('/partners', requireAuth, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { id: { not: req.user!.id } },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
  res.json(users);
});

// PUT /users/me/standing-proxy { proxyId }
router.put('/me/standing-proxy', requireAuth, async (req, res) => {
  const { proxyId } = req.body;
  if (!proxyId) return res.status(400).json({ error: 'proxyId required' });

  const target = await prisma.user.findUnique({ where: { id: proxyId } });
  if (!target) return res.status(400).json({ error: 'User not found' });
  if (proxyId === req.user!.id) return res.status(400).json({ error: 'Cannot proxy to yourself' });

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { standingProxyId: proxyId },
    include: { standingProxy: { select: { id: true, name: true } } },
  });

  await prisma.auditLog.create({
    data: { action: 'STANDING_PROXY_SET', actorId: req.user!.id, targetId: proxyId },
  });

  res.json(user);
});

// DELETE /users/me/standing-proxy
router.delete('/me/standing-proxy', requireAuth, async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { standingProxyId: null },
  });

  await prisma.auditLog.create({
    data: { action: 'STANDING_PROXY_REVOKED', actorId: req.user!.id },
  });

  res.json(user);
});

export default router;
