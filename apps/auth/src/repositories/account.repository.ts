import { Injectable } from '@nestjs/common';
import { uuidv7 } from '@common';
import type { AccountEntity, CreateAccountData } from '@auth/entities/account.entity';
import { PrismaService } from '@auth/prisma/prisma.service';
import type { AccountEmailRecord, IAccountRepository } from '@auth/repositories/account.repository.interface';
import { type Account, type AccountStatus, type Role } from '@auth/prisma-client';

type AccountWithRoles = Account & {
   accountRoles?: Array<{
      role: Role;
   }>;
};

@Injectable()
export class AccountRepository implements IAccountRepository {
   constructor(private readonly prisma: PrismaService) {}

   private toEntity(account: AccountWithRoles): AccountEntity {
      return {
         id: account.accountId,
         email: account.email,
         phoneNumber: account.phoneNumber,
         passwordHash: account.passwordHash,
         status: account.status,
         isEmailVerified: account.isEmailVerified,
         lastLoginAt: account.lastLoginAt ? account.lastLoginAt.toISOString() : null,
         version: account.version,
         deletedAt: account.deletedAt ? account.deletedAt.toISOString() : null,
         roles: account.accountRoles ? account.accountRoles.map((ur) => ur.role.code) : [],
         createdAt: account.createdAt.toISOString(),
         updatedAt: account.updatedAt.toISOString(),
      };
   }

   async findByEmail(email: string): Promise<AccountEntity | null> {
      const normalizedEmail = email.toLowerCase().trim();
      const account = await this.prisma.account.findFirst({
         where: {
            email: normalizedEmail,
            deletedAt: null,
         },
         include: {
            accountRoles: {
               include: {
                  role: true,
               },
            },
         },
      });

      return account ? this.toEntity(account) : null;
   }

   async findById(accountId: string): Promise<AccountEntity | null> {
      const account = await this.prisma.account.findFirst({
         where: {
            accountId,
            deletedAt: null,
         },
         include: {
            accountRoles: {
               include: {
                  role: true,
               },
            },
         },
      });

      return account ? this.toEntity(account) : null;
   }

   async findEmailById(accountId: string): Promise<AccountEmailRecord | null> {
      const record = await this.prisma.account.findFirst({
         where: {
            accountId,
            deletedAt: null,
         },
         select: {
            accountId: true,
            email: true,
            isEmailVerified: true,
         },
      });

      return record
         ? {
              id: record.accountId,
              email: record.email,
              isEmailVerified: record.isEmailVerified,
           }
         : null;
   }

   async findAllEmails(): Promise<string[]> {
      const accounts = await this.prisma.account.findMany({
         where: {
            deletedAt: null,
         },
         select: {
            email: true,
         },
      });

      return accounts.map((a) => a.email);
   }

   async create(data: CreateAccountData): Promise<AccountEntity> {
      const accountId = data.id || uuidv7();

      const createdAccount = await this.prisma.account.create({
         data: {
            accountId,
            email: data.email,
            phoneNumber: data.phoneNumber,
            passwordHash: data.passwordHash,
            status: data.status as AccountStatus,
            isEmailVerified: data.isEmailVerified,
            createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
            accountRoles: data.roleId
               ? {
                    create: [
                       {
                          roleId: data.roleId,
                       },
                    ],
                 }
               : undefined,
         },
         include: {
            accountRoles: {
               include: {
                  role: true,
               },
            },
         },
      });

      return this.toEntity(createdAccount);
   }

   async update(accountId: string, data: Partial<AccountEntity>): Promise<AccountEntity | null> {
      try {
         const account = await this.prisma.account.update({
            where: { accountId },
            data: {
               email: data.email,
               phoneNumber: data.phoneNumber,
               passwordHash: data.passwordHash,
               status: data.status as AccountStatus,
               isEmailVerified: data.isEmailVerified,
               lastLoginAt: data.lastLoginAt
                  ? new Date(data.lastLoginAt)
                  : data.lastLoginAt === null
                    ? null
                    : undefined,
               version: data.version,
               deletedAt: data.deletedAt ? new Date(data.deletedAt) : data.deletedAt === null ? null : undefined,
            },
            include: {
               accountRoles: {
                  include: {
                     role: true,
                  },
               },
            },
         });

         return this.toEntity(account);
      } catch {
         return null;
      }
   }

   async softDelete(accountId: string): Promise<boolean> {
      try {
         await this.prisma.account.update({
            where: { accountId },
            data: { deletedAt: new Date() },
         });
         return true;
      } catch {
         return false;
      }
   }

   async delete(accountId: string): Promise<boolean> {
      try {
         await this.prisma.account.delete({
            where: { accountId },
         });
         return true;
      } catch {
         return false;
      }
   }
}
