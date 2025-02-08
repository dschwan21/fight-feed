import { PrismaClient } from '@prisma/client';

// Ensure a single PrismaClient instance in development
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export the default instance
export default prisma;