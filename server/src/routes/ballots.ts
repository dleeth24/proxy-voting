import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /ballots
router.get('/', requireAuth, async (req, res) => {
  const isAdmin = req.user!.role === 'ADMIN';
  const ballots = await prisma.ballot.findMany({
    where: isAdmin ? {} : { status: { in: ['OPEN', 'CLOSED'] } },
    include: {
      options: { orderBy: { orderIndex: 'asc' } },
      createdBy: { select: { name: true } },
      _count: { select: { votes: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(ballots);
});

// GET /ballots/:id
router.get('/:id', requireAuth, async (req, res) => {
  const ballot = await prisma.ballot.findUnique({
    where: { id: req.params.id },
    include: {
      options: { orderBy: { orderIndex: 'asc' } },
      createdBy: { select: { name: true } },
    },
  });
  if (!ballot) return res.status(404).json({ error: 'Not found' });
  res.json(ballot);
});

// POST /ballots — admin
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { title, description, isSecret, opensAt, closesAt, options } = req.body;
  const ballot = await prisma.ballot.create({
    data: {
      title,
      description,
      isSecret,
      opensAt: opensAt ? new Date(opensAt) : null,
      closesAt: closesAt ? new Date(closesAt) : null,
      createdById: req.user!.id,
      options: {
        create: options.map((o: { label: string; orderIndex: number }) => ({
          label: o.label,
          orderIndex: o.orderIndex,
        })),
      },
    },
    include: { options: true },
  });

  await prisma.auditLog.create({
    data: { action: 'BALLOT_CREATED', actorId: req.user!.id, ballotId: ballot.id },
  });

  res.status(201).json(ballot);
});

// PUT /ballots/:id — admin, draft only
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const existing = await prisma.ballot.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status !== 'DRAFT') return res.status(400).json({ error: 'Can only edit DRAFT ballots' });

  const { title, description, isSecret, opensAt, closesAt, options } = req.body;

  // Delete existing options and recreate
  await prisma.ballotOption.deleteMany({ where: { ballotId: req.params.id } });

  const ballot = await prisma.ballot.update({
    where: { id: req.params.id },
    data: {
      title,
      description,
      isSecret,
      opensAt: opensAt ? new Date(opensAt) : null,
      closesAt: closesAt ? new Date(closesAt) : null,
      options: {
        create: options.map((o: { label: string; orderIndex: number }) => ({
          label: o.label,
          orderIndex: o.orderIndex,
        })),
      },
    },
    include: { options: true },
  });

  res.json(ballot);
});

// POST /ballots/:id/open
router.post('/:id/open', requireAuth, requireAdmin, async (req, res) => {
  const ballot = await prisma.ballot.update({
    where: { id: req.params.id },
    data: { status: 'OPEN' },
  });

  await prisma.auditLog.create({
    data: { action: 'BALLOT_OPENED', actorId: req.user!.id, ballotId: ballot.id },
  });

  res.json(ballot);
});

// POST /ballots/:id/close
router.post('/:id/close', requireAuth, requireAdmin, async (req, res) => {
  const ballot = await prisma.ballot.update({
    where: { id: req.params.id },
    data: { status: 'CLOSED' },
  });

  await prisma.auditLog.create({
    data: { action: 'BALLOT_CLOSED', actorId: req.user!.id, ballotId: ballot.id },
  });

  res.json(ballot);
});

// GET /ballots/:id/results
router.get('/:id/results', requireAuth, async (req, res) => {
  const isAdmin = req.user!.role === 'ADMIN';

  const ballot = await prisma.ballot.findUnique({
    where: { id: req.params.id },
    include: {
      options: {
        include: {
          votes: {
            include: {
              owner: { select: { name: true } },
              castBy: { select: { name: true } },
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!ballot) return res.status(404).json({ error: 'Not found' });

  const totalVotes = ballot.options.reduce((sum, o) => sum + o.votes.length, 0);
  const totalEligible = await prisma.user.count();

  const options = ballot.options.map(o => ({
    id: o.id,
    label: o.label,
    count: o.votes.length,
    percentage: totalVotes > 0 ? Math.round((o.votes.length / totalVotes) * 100) : 0,
    voters:
      isAdmin || !ballot.isSecret
        ? o.votes.map(v => ({
            name: v.owner.name,
            votedAs: v.isProxyVote ? 'proxy' : 'direct',
            castByName: v.isProxyVote ? v.castBy.name : undefined,
          }))
        : undefined,
  }));

  res.json({
    ballotId: ballot.id,
    title: ballot.title,
    status: ballot.status,
    isSecret: ballot.isSecret,
    totalEligible,
    totalVoted: totalVotes,
    options,
  });
});

// GET /ballots/:id/my-vote
router.get('/:id/my-vote', requireAuth, async (req, res) => {
  const vote = await prisma.vote.findUnique({
    where: { ballotId_ownerId: { ballotId: req.params.id, ownerId: req.user!.id } },
    include: { option: true, castBy: { select: { name: true } } },
  });
  res.json(vote ?? null);
});

// GET /ballots/:id/effective-proxy
router.get('/:id/effective-proxy', requireAuth, async (req, res) => {
  const { id: ballotId } = req.params;
  const principalId = req.user!.id;

  const override = await prisma.ballotProxyOverride.findUnique({
    where: { ballotId_principalId: { ballotId, principalId } },
    include: { proxy: { select: { id: true, name: true } } },
  });
  if (override) return res.json({ proxy: override.proxy, source: 'override' });

  const user = await prisma.user.findUnique({
    where: { id: principalId },
    include: { standingProxy: { select: { id: true, name: true } } },
  });
  if (user?.standingProxy) return res.json({ proxy: user.standingProxy, source: 'standing' });

  res.json({ proxy: null, source: null });
});

// PUT /ballots/:id/proxy-override { proxyId }
router.put('/:id/proxy-override', requireAuth, async (req, res) => {
  const { proxyId } = req.body;
  const approved = await prisma.approvedProxyHolder.findUnique({ where: { userId: proxyId } });
  if (!approved) return res.status(400).json({ error: 'Not an approved proxy holder' });

  const override = await prisma.ballotProxyOverride.upsert({
    where: { ballotId_principalId: { ballotId: req.params.id, principalId: req.user!.id } },
    update: { proxyId },
    create: { ballotId: req.params.id, principalId: req.user!.id, proxyId },
  });

  await prisma.auditLog.create({
    data: {
      action: 'BALLOT_PROXY_OVERRIDE_SET',
      actorId: req.user!.id,
      ballotId: req.params.id,
      targetId: proxyId,
    },
  });

  res.json(override);
});

// DELETE /ballots/:id/proxy-override
router.delete('/:id/proxy-override', requireAuth, async (req, res) => {
  await prisma.ballotProxyOverride.deleteMany({
    where: { ballotId: req.params.id, principalId: req.user!.id },
  });

  await prisma.auditLog.create({
    data: {
      action: 'BALLOT_PROXY_OVERRIDE_REVOKED',
      actorId: req.user!.id,
      ballotId: req.params.id,
    },
  });

  res.json({ ok: true });
});

// POST /ballots/:id/vote { optionId }
router.post('/:id/vote', requireAuth, async (req, res) => {
  const { optionId } = req.body;
  const ballot = await prisma.ballot.findUnique({ where: { id: req.params.id } });
  if (!ballot || ballot.status !== 'OPEN') {
    return res.status(400).json({ error: 'Ballot is not open' });
  }

  try {
    const vote = await prisma.vote.create({
      data: {
        ballotId: req.params.id,
        optionId,
        ownerId: req.user!.id,
        castById: req.user!.id,
        isProxyVote: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'VOTE_CAST',
        actorId: req.user!.id,
        ballotId: req.params.id,
        metadata: { optionId },
      },
    });

    res.status(201).json(vote);
  } catch (e: any) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'Already voted on this ballot' });
    }
    throw e;
  }
});

// POST /ballots/:id/proxy-vote { principalId, optionId }
router.post('/:id/proxy-vote', requireAuth, async (req, res) => {
  const { principalId, optionId } = req.body;
  const proxyId = req.user!.id;

  const approved = await prisma.approvedProxyHolder.findUnique({ where: { userId: proxyId } });
  if (!approved) return res.status(403).json({ error: 'You are not an approved proxy holder' });

  const override = await prisma.ballotProxyOverride.findUnique({
    where: { ballotId_principalId: { ballotId: req.params.id, principalId } },
  });
  const principal = await prisma.user.findUnique({ where: { id: principalId } });

  const effectiveProxyId = override?.proxyId ?? principal?.standingProxyId ?? null;
  if (effectiveProxyId !== proxyId) {
    return res.status(403).json({ error: 'You are not the designated proxy for this partner on this ballot' });
  }

  const ballot = await prisma.ballot.findUnique({ where: { id: req.params.id } });
  if (!ballot || ballot.status !== 'OPEN') {
    return res.status(400).json({ error: 'Ballot is not open' });
  }

  try {
    const vote = await prisma.vote.create({
      data: {
        ballotId: req.params.id,
        optionId,
        ownerId: principalId,
        castById: proxyId,
        isProxyVote: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'PROXY_VOTE_CAST',
        actorId: proxyId,
        ballotId: req.params.id,
        targetId: principalId,
        metadata: { optionId },
      },
    });

    res.status(201).json(vote);
  } catch (e: any) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'This partner has already voted on this ballot' });
    }
    throw e;
  }
});

// GET /ballots/:id/proxy-principals — for proxy holders to see who they vote for
router.get('/:id/proxy-principals', requireAuth, async (req, res) => {
  const proxyHolderId = req.user!.id;
  const ballotId = req.params.id;

  // Standing proxy principals
  const standingPrincipals = await prisma.user.findMany({
    where: { standingProxyId: proxyHolderId },
    select: { id: true, name: true, email: true },
  });

  // Per-ballot override principals for this ballot
  const overrides = await prisma.ballotProxyOverride.findMany({
    where: { ballotId, proxyId: proxyHolderId },
    include: { principal: { select: { id: true, name: true, email: true } } },
  });
  const overridePrincipalIds = new Set(overrides.map(o => o.principalId));

  // Standing principals who have a different override for this ballot (exclude them)
  const conflictingOverrides = await prisma.ballotProxyOverride.findMany({
    where: {
      ballotId,
      principalId: { in: standingPrincipals.map(p => p.id) },
      proxyId: { not: proxyHolderId },
    },
    select: { principalId: true },
  });
  const conflictingIds = new Set(conflictingOverrides.map(o => o.principalId));

  const effectivePrincipals = [
    ...standingPrincipals.filter(p => !conflictingIds.has(p.id) && !overridePrincipalIds.has(p.id)),
    ...overrides.map(o => o.principal),
  ];

  // Attach vote status
  const votes = await prisma.vote.findMany({
    where: { ballotId, ownerId: { in: effectivePrincipals.map(p => p.id) } },
    select: { ownerId: true },
  });
  const votedSet = new Set(votes.map(v => v.ownerId));

  res.json(
    effectivePrincipals.map(p => ({
      ...p,
      hasVoted: votedSet.has(p.id),
    }))
  );
});

export default router;
