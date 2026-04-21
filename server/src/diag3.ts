import { writeFileSync, appendFileSync } from 'fs';
const L = (m: string) => { appendFileSync('/tmp/d3.txt', m+'\n'); process.stderr.write(m+'\n'); };
writeFileSync('/tmp/d3.txt', '');
L('1: fs works');

async function main() {
  L('2: in main');
  await import('dotenv/config'); L('3: dotenv');
  await import('express'); L('4: express');
  const { PrismaClient } = await import('@prisma/client'); L('5: prisma imported');
  const p = new PrismaClient(); L('6: prisma instantiated');
  L('done');
  process.exit(0);
}
main().catch(e => { L('ERROR: ' + e.message); process.exit(1); });
