import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Users ────────────────────────────────────────────────────────────────

  const adminData = [
    { email: 'margaret.chen@lawfirm.com', name: 'Margaret Chen' },
    { email: 'robert.hayes@lawfirm.com', name: 'Robert Hayes' },
  ];

  const partnerData = [
    { email: 'james.whitfield@lawfirm.com', name: 'James Whitfield' },
    { email: 'diana.torres@lawfirm.com', name: 'Diana Torres' },
    { email: 'samuel.okafor@lawfirm.com', name: 'Samuel Okafor' },
    { email: 'priya.sharma@lawfirm.com', name: 'Priya Sharma' },
    { email: 'thomas.brennan@lawfirm.com', name: 'Thomas Brennan' },
    { email: 'claire.dupont@lawfirm.com', name: 'Claire Dupont' },
    { email: 'michael.kim@lawfirm.com', name: 'Michael Kim' },
    { email: 'helen.foster@lawfirm.com', name: 'Helen Foster' },
    { email: 'carlos.reyes@lawfirm.com', name: 'Carlos Reyes' },
    { email: 'naomi.berg@lawfirm.com', name: 'Naomi Berg' },
    { email: 'edward.walsh@lawfirm.com', name: 'Edward Walsh' },
    { email: 'yuki.tanaka@lawfirm.com', name: 'Yuki Tanaka' },
  ];

  const admins = await Promise.all(
    adminData.map(d =>
      prisma.user.upsert({
        where: { email: d.email },
        update: {},
        create: { ...d, role: 'ADMIN' },
      })
    )
  );

  const partners = await Promise.all(
    partnerData.map(d =>
      prisma.user.upsert({
        where: { email: d.email },
        update: {},
        create: { ...d, role: 'PARTNER' },
      })
    )
  );

  const allUsers = [...admins, ...partners];
  const [margaret, robert] = admins;
  const [james, diana, samuel, priya, thomas, claire, michael, helen, carlos, naomi, edward, yuki] = partners;

  // ── Standing proxies ─────────────────────────────────────────────────────

  await prisma.user.update({ where: { id: thomas.id }, data: { standingProxyId: diana.id } });
  await prisma.user.update({ where: { id: claire.id }, data: { standingProxyId: james.id } });
  await prisma.user.update({ where: { id: michael.id }, data: { standingProxyId: samuel.id } });
  await prisma.user.update({ where: { id: helen.id }, data: { standingProxyId: james.id } });

  // ── Default theme setting ────────────────────────────────────────────────

  await prisma.appSettings.upsert({
    where: { key: 'primaryColor' },
    update: {},
    create: { key: 'primaryColor', value: '#1e3a5f' },
  });

  // ── Ballot 1: CLOSED, secret, all votes in ───────────────────────────────

  const ballot1 = await prisma.ballot.upsert({
    where: { id: 'seed-ballot-1' },
    update: {},
    create: {
      id: 'seed-ballot-1',
      title: 'Annual Partner Compensation Review – FY2025',
      description:
        'Vote to approve the recommended compensation structure for the upcoming fiscal year as presented by the Compensation Committee.',
      status: 'CLOSED',
      isSecret: true,
      createdById: margaret.id,
      options: {
        create: [
          { label: 'Approve as presented', orderIndex: 0 },
          { label: 'Approve with minor modifications', orderIndex: 1 },
          { label: 'Reject – refer back to committee', orderIndex: 2 },
        ],
      },
    },
    include: { options: true },
  });

  const b1opts = ballot1.options;
  const b1votes: [typeof james, typeof james, (typeof b1opts)[0], boolean][] = [
    [james, james, b1opts[0], false],
    [diana, diana, b1opts[0], false],
    [samuel, samuel, b1opts[0], false],
    [priya, priya, b1opts[1], false],
    [thomas, diana, b1opts[0], true],
    [claire, james, b1opts[1], true],
    [michael, samuel, b1opts[0], true],
    [helen, james, b1opts[0], true],
    [carlos, carlos, b1opts[1], false],
    [naomi, naomi, b1opts[0], false],
    [edward, edward, b1opts[2], false],
    [yuki, yuki, b1opts[0], false],
    [margaret, margaret, b1opts[0], false],
    [robert, robert, b1opts[0], false],
  ];

  for (const [owner, castBy, option, isProxy] of b1votes) {
    await prisma.vote.upsert({
      where: { ballotId_ownerId: { ballotId: ballot1.id, ownerId: owner.id } },
      update: {},
      create: {
        ballotId: ballot1.id,
        optionId: option.id,
        ownerId: owner.id,
        castById: castBy.id,
        isProxyVote: isProxy,
      },
    });
  }

  // ── Ballot 2: OPEN, not secret ───────────────────────────────────────────

  const ballot2 = await prisma.ballot.upsert({
    where: { id: 'seed-ballot-2' },
    update: {},
    create: {
      id: 'seed-ballot-2',
      title: 'New Practice Group: Artificial Intelligence & Technology',
      description:
        'Proposal to establish a new practice group focused on AI, machine learning, and emerging technology matters. The group would have 8 initial partner members.',
      status: 'OPEN',
      isSecret: false,
      closesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdById: robert.id,
      options: {
        create: [
          { label: 'Yes – establish the practice group', orderIndex: 0 },
          { label: 'No – defer to next year', orderIndex: 1 },
          { label: 'Abstain', orderIndex: 2 },
        ],
      },
    },
    include: { options: true },
  });

  const b2opts = ballot2.options;
  const b2votes: [typeof james, typeof james, (typeof b2opts)[0], boolean][] = [
    [james, james, b2opts[0], false],
    [diana, diana, b2opts[0], false],
    [samuel, samuel, b2opts[1], false],
    [priya, priya, b2opts[0], false],
    [margaret, margaret, b2opts[0], false],
  ];

  for (const [owner, castBy, option, isProxy] of b2votes) {
    await prisma.vote.upsert({
      where: { ballotId_ownerId: { ballotId: ballot2.id, ownerId: owner.id } },
      update: {},
      create: {
        ballotId: ballot2.id,
        optionId: option.id,
        ownerId: owner.id,
        castById: castBy.id,
        isProxyVote: isProxy,
      },
    });
  }

  // ── Ballot 3: OPEN, secret ───────────────────────────────────────────────

  await prisma.ballot.upsert({
    where: { id: 'seed-ballot-3' },
    update: {},
    create: {
      id: 'seed-ballot-3',
      title: 'Lateral Partner Admission – Candidate A',
      description:
        'Vote on the admission of a lateral partner candidate in the Corporate M&A practice. Candidate details distributed separately via secure memo.',
      status: 'OPEN',
      isSecret: true,
      closesAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      createdById: margaret.id,
      options: {
        create: [
          { label: 'Admit', orderIndex: 0 },
          { label: 'Do not admit', orderIndex: 1 },
          { label: 'Abstain', orderIndex: 2 },
        ],
      },
    },
  });

  // ── Ballot 4: DRAFT ──────────────────────────────────────────────────────

  await prisma.ballot.upsert({
    where: { id: 'seed-ballot-4' },
    update: {},
    create: {
      id: 'seed-ballot-4',
      title: 'Office Expansion – Austin, TX',
      description:
        'Proposal to open a satellite office in Austin, Texas. Estimated startup cost: $2.4M. Full business case attached.',
      status: 'DRAFT',
      isSecret: false,
      createdById: robert.id,
      options: {
        create: [
          { label: 'Approve expansion', orderIndex: 0 },
          { label: 'Approve with reduced scope', orderIndex: 1 },
          { label: 'Reject proposal', orderIndex: 2 },
        ],
      },
    },
  });

  // ── Audit log entries ────────────────────────────────────────────────────

  await prisma.auditLog.createMany({
    data: [
      { action: 'BALLOT_CREATED', actorId: margaret.id, ballotId: 'seed-ballot-1' },
      { action: 'BALLOT_OPENED', actorId: margaret.id, ballotId: 'seed-ballot-1' },
      { action: 'BALLOT_CLOSED', actorId: margaret.id, ballotId: 'seed-ballot-1' },
      { action: 'BALLOT_CREATED', actorId: robert.id, ballotId: 'seed-ballot-2' },
      { action: 'BALLOT_OPENED', actorId: robert.id, ballotId: 'seed-ballot-2' },
      { action: 'BALLOT_CREATED', actorId: margaret.id, ballotId: 'seed-ballot-3' },
      { action: 'BALLOT_OPENED', actorId: margaret.id, ballotId: 'seed-ballot-3' },
      { action: 'BALLOT_CREATED', actorId: robert.id, ballotId: 'seed-ballot-4' },
    ],
    skipDuplicates: true,
  });

  console.log('✓ Seeded users, proxy holders, ballots, and votes');
  console.log('\nLogin as any of these users (mock mode – no password):');
  allUsers.forEach(u => console.log(`  [${u.role}] ${u.name} → ${u.email}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
