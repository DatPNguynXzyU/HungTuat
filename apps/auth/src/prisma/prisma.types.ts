import type { Prisma } from '@auth/prisma-client';
import type { PrismaService } from '@auth/prisma/prisma.service';

export type PrismaClientOrTransaction = PrismaService | Prisma.TransactionClient;
