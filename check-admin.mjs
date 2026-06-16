import { PrismaClient } from './src/generated/prisma/client.js';
const p = new PrismaClient();
try {
  const users = await p.user.findMany({
    where: {
      OR: [
        { role: { in: ['admin', 'super_admin'] } },
        { email: { contains: 'admin' } }
      ]
    },
    select: { id: true, email: true, role: true, loginAttempts: true, lockedUntil: true, password: true }
  });
  console.log(JSON.stringify(users, (key, val) => key === 'password' ? val.substring(0, 20) + '...' : val, 2));
} catch (e) { console.error(e); }
finally { await p.$disconnect(); }
