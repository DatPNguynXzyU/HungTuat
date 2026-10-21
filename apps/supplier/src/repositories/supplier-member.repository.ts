import { Injectable } from '@nestjs/common';
import { DEFAULT_ROLES } from '@common';
import { SUPPLIER_MEMBER_STATUS } from '@contracts/supplier';
import { PrismaService } from '@supplier/prisma/prisma.service';
import type { MemberStatus as PrismaMemberStatus } from '@supplier/prisma-client';
import type {
   CreateSupplierMemberData,
   SupplierMemberEntity,
   UpdateSupplierMemberData,
} from '@supplier/entities/supplier-member.entity';
import type { ISupplierMemberRepository } from '@supplier/repositories/supplier-member.repository.interface';

@Injectable()
export class SupplierMemberRepository implements ISupplierMemberRepository {
   constructor(private readonly prisma: PrismaService) {}

   private mapPrismaToEntity(record: {
      memberId: string;
      supplierId: string | null;
      accountId: string;
      email: string;
      role: string;
      memberStatus: PrismaMemberStatus;
      joinedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
   }): SupplierMemberEntity {
      return {
         memberId: record.memberId,
         supplierId: record.supplierId,
         accountId: record.accountId,
         email: record.email,
         role: record.role,
         memberStatus: record.memberStatus,
         joinedAt: record.joinedAt,
         createdAt: record.createdAt,
         updatedAt: record.updatedAt,
         deletedAt: record.deletedAt,
      };
   }

   async findById(memberId: string): Promise<SupplierMemberEntity | null> {
      const record = await this.prisma.supplierMember.findFirst({
         where: { memberId, deletedAt: null },
      });
      return record ? this.mapPrismaToEntity(record) : null;
   }

   async findByAccountId(accountId: string): Promise<SupplierMemberEntity | null> {
      const record = await this.prisma.supplierMember.findFirst({
         where: { accountId, deletedAt: null },
      });
      return record ? this.mapPrismaToEntity(record) : null;
   }

   async findBySupplierId(supplierId: string): Promise<SupplierMemberEntity[]> {
      const records = await this.prisma.supplierMember.findMany({
         where: { supplierId, deletedAt: null },
         orderBy: { createdAt: 'asc' },
      });
      return records.map((record) => this.mapPrismaToEntity(record));
   }

   async create(data: CreateSupplierMemberData): Promise<SupplierMemberEntity> {
      const record = await this.prisma.supplierMember.create({
         data: {
            supplierId: data.supplierId ?? null,
            accountId: data.accountId,
            email: data.email,
            role: data.role ?? DEFAULT_ROLES.SUPPLIER_ADMIN,
            memberStatus: (data.memberStatus as PrismaMemberStatus) ?? SUPPLIER_MEMBER_STATUS.ACTIVE,
            joinedAt: data.joinedAt ?? null,
         },
      });
      return this.mapPrismaToEntity(record);
   }

   async update(memberId: string, data: UpdateSupplierMemberData): Promise<SupplierMemberEntity | null> {
      const existing = await this.prisma.supplierMember.findFirst({
         where: { memberId, deletedAt: null },
      });
      if (!existing) {
         return null;
      }
      const record = await this.prisma.supplierMember.update({
         where: { memberId },
         data: {
            ...(data.supplierId !== undefined ? { supplierId: data.supplierId } : {}),
            ...(data.role !== undefined ? { role: data.role } : {}),
            ...(data.memberStatus !== undefined ? { memberStatus: data.memberStatus as PrismaMemberStatus } : {}),
            ...(data.joinedAt !== undefined ? { joinedAt: data.joinedAt } : {}),
         },
      });
      return this.mapPrismaToEntity(record);
   }

   async softDelete(memberId: string): Promise<boolean> {
      const existing = await this.prisma.supplierMember.findFirst({
         where: { memberId, deletedAt: null },
      });
      if (!existing) {
         return false;
      }
      await this.prisma.supplierMember.update({
         where: { memberId },
         data: { deletedAt: new Date() },
      });
      return true;
   }
}
