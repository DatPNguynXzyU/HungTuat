import type { Prisma } from '@user/prisma-client';
import type { PrismaService } from '@user/prisma/prisma.service';

export type PrismaClientOrTransaction = PrismaService | Prisma.TransactionClient;
