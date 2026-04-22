import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reset() {
  console.log('Resetting demo data…');

  // Delete in reverse-dependency order (no cascade on Vote/Override from Ballot)
  await prisma.auditLog.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.ballotProxyOverride.deleteMany();
  await prisma.ballotOption.deleteMany();
  await prisma.ballot.deleteMany();
  await prisma.approvedProxyHolder.deleteMany();

  // Reset any standing proxies partners may have changed
  await prisma.user.updateMany({ data: { standingProxyId: null } });

  console.log('✓ Demo data cleared — running seed…\n');
}

reset()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
