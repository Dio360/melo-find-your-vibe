import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm');
console.log('pg_trgm enabled');
await prisma.$disconnect();
