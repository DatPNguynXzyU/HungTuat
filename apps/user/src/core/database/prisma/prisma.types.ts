import type { Prisma } from '@user/prisma-client';
import type { PrismaService } from '@user/core/database/prisma/prisma.service';

export type PrismaClientOrTransaction = PrismaService | Prisma.TransactionClient;
