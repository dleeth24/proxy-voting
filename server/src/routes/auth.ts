import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { requireAuth } from '../middleware/auth';

const router = Router();

// POST /auth/login { email } — mock mode only
router.post('/login', async (req, res) => {
  if (process.env.MOCK_AUTH !== 'true') {
    return res.status(400).json({ error: 'Mock auth is disabled' });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const token = signToken({ userId: user.id, role: user.role });

  await prisma.auditLog.create({
    data: { action: 'USER_LOGIN', actorId: user.id },
  });

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// GET /auth/users — mock login dropdown (mock mode only)
router.get('/users', async (_req, res) => {
  if (process.env.MOCK_AUTH !== 'true') {
    return res.status(404).json({ error: 'Not available' });
  }
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
  res.json(users);
});

// GET /auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

export default router;
