import { Test, TestingModule } from '@nestjs/testing';
import type { Prisma } from '@user/prisma-client';
import { PrismaService } from '@user/prisma/prisma.service';
import { PrismaUnitOfWork } from '@user/unit-of-work/prisma-unit-of-work';

describe('PrismaUnitOfWork', () => {
   let unitOfWork: PrismaUnitOfWork;
   let mockPrismaService: {
      $transaction: jest.Mock;
   };
   let mockTx: {
      user: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
      follow: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
      userStats: { upsert: jest.Mock };
      outbox: { create: jest.Mock };
   };

   beforeEach(async () => {
      mockTx = {
         user: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
         follow: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
         userStats: { upsert: jest.fn() },
         outbox: { create: jest.fn() },
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
         expect(repos.userProfileRepository).toBeDefined();
         expect(repos.followRepository).toBeDefined();
         expect(repos.outboxRepository).toBeDefined();
         return await Promise.resolve('user_success_result');
      });

      expect(result).toBe('user_success_result');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
   });

   it('should rollback and rethrow when work callback throws', async () => {
      const failureError = new Error('Database transaction write failure');

      await expect(
         unitOfWork.runInTransaction(async () => {
            await Promise.resolve();
            throw failureError;
         }),
      ).rejects.toThrow('Database transaction write failure');

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
   });

   it('should reuse active transaction in nested runInTransaction calls', async () => {
      let innerRepoExecuted = false;

      const outerResult = await unitOfWork.runInTransaction(async (outerRepos) => {
         expect(unitOfWork.getCurrentTransaction()).toBe(mockTx as unknown as Prisma.TransactionClient);

         const innerResult = await unitOfWork.runInTransaction(async (innerRepos) => {
            expect(innerRepos.userProfileRepository).toBeDefined();
            innerRepoExecuted = true;
            return await Promise.resolve('inner_value');
         });

         expect(innerResult).toBe('inner_value');
         expect(outerRepos.followRepository).toBeDefined();
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
