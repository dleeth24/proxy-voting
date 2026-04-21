import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /settings — public
router.get('/', async (_req, res) => {
  const settings = await prisma.appSettings.findMany();
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  res.json(map);
});

// PUT /settings — admin only
router.put('/', requireAuth, requireAdmin, async (req, res) => {
  const { key, value } = req.body;
  if (!key || !value) return res.status(400).json({ error: 'key and value required' });

  const setting = await prisma.appSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  await prisma.auditLog.create({
    data: {
      action: 'SETTINGS_UPDATED',
      actorId: req.user!.id,
      metadata: { key, value },
    },
  });

  res.json(setting);
});

export default router;
