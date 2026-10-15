import { Test, TestingModule } from '@nestjs/testing';
import type { Prisma } from '@auth/prisma-client';
import { PrismaService } from '@auth/prisma/prisma.service';
import { PrismaUnitOfWork } from '@auth/unit-of-work/prisma-unit-of-work';

describe('PrismaUnitOfWork', () => {
   let unitOfWork: PrismaUnitOfWork;
   let mockPrismaService: {
      $transaction: jest.Mock;
   };
   let mockTx: {
      account: { findFirst: jest.Mock; create: jest.Mock };
      outboxEvent: { create: jest.Mock };
      role: { findFirst: jest.Mock };
      accountRole: { upsert: jest.Mock };
      accountSession: { create: jest.Mock };
      securityAuditLog: { create: jest.Mock };
   };

   beforeEach(async () => {
      mockTx = {
         account: { findFirst: jest.fn(), create: jest.fn() },
         outboxEvent: { create: jest.fn() },
         role: { findFirst: jest.fn() },
         accountRole: { upsert: jest.fn() },
         accountSession: { create: jest.fn() },
         securityAuditLog: { create: jest.fn() },
      };

      mockPrismaService = {
         $transaction: jest.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            PrismaUnitOfWork,
            {
               provide: PrismaService,
               useValue: mockPrismaService,
            },
         ],
      }).compile();

      unitOfWork = module.get<PrismaUnitOfWork>(PrismaUnitOfWork);
   });

   it('should be defined', () => {
      expect(unitOfWork).toBeDefined();
   });

   it('should execute work in transaction and return result', async () => {
      const result = await unitOfWork.runInTransaction(async (repos) => {
         expect(repos.accountRepository).toBeDefined();
         expect(repos.outboxRepository).toBeDefined();
         expect(repos.rbacRepository).toBeDefined();
         expect(repos.sessionRepository).toBeDefined();
         expect(repos.auditLogRepository).toBeDefined();
         return await Promise.resolve('success_result');
      });

      expect(result).toBe('success_result');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
   });

   it('should rollback and rethrow when work callback throws', async () => {
      const failureError = new Error('Database write failure');

      await expect(
         unitOfWork.runInTransaction(async () => {
            await Promise.resolve();
            throw failureError;
         }),
      ).rejects.toThrow('Database write failure');

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
   });

   it('should reuse active transaction in nested runInTransaction calls', async () => {
      let innerRepoExecuted = false;

      const outerResult = await unitOfWork.runInTransaction(async (outerRepos) => {
         expect(unitOfWork.getCurrentTransaction()).toBe(mockTx as unknown as Prisma.TransactionClient);

         const innerResult = await unitOfWork.runInTransaction(async (innerRepos) => {
            expect(innerRepos.accountRepository).toBeDefined();
            innerRepoExecuted = true;
            return await Promise.resolve('inner_value');
         });

         expect(innerResult).toBe('inner_value');
         expect(outerRepos.accountRepository).toBeDefined();
         return await Promise.resolve('outer_value');
      });

      expect(outerResult).toBe('outer_value');
      expect(innerRepoExecuted).toBe(true);
      // Prisma.$transaction should only be called once for the outer boundary
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
   });

   it('should pass transaction options to prisma.$transaction', async () => {
      const options = {
         timeout: 10000,
         maxWait: 5000,
      };

      await unitOfWork.runInTransaction(async () => {
         await Promise.resolve();
         return 'ok';
      }, options);

      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
         expect.any(Function),
         expect.objectContaining({
            timeout: 10000,
            maxWait: 5000,
         }),
      );
   });

   it('should return undefined for getCurrentTransaction outside a transaction', () => {
      expect(unitOfWork.getCurrentTransaction()).toBeUndefined();
   });
});
