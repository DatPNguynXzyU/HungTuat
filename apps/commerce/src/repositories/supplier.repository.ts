import { Injectable } from '@nestjs/common';
import { SUPPLIER_STATUS } from '@contracts/commerce';
import { PrismaService } from '@commerce/prisma/prisma.service';
import type { SupplierStatus } from '@commerce/prisma-client';
import type { CreateSupplierData, SupplierEntity, UpdateSupplierData } from '@commerce/entities/supplier.entity';
import type { ISupplierRepository } from '@commerce/repositories/supplier.repository.interface';

@Injectable()
export class SupplierRepository implements ISupplierRepository {
   constructor(private readonly prisma: PrismaService) {}

   private mapPrismaToEntity(record: {
      supplierId: string;
      supplierName: string;
      supplierSlug: string;
      supplierCode: string;
      contactEmail: string | null;
      contactPhone: string | null;
      address: string | null;
      city: string | null;
      rating: number;
      isVerified: boolean;
      supplierStatus: string;
      supplierLogoUrl: string | null;
      version: number;
      deletedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
   }): SupplierEntity {
      return {
         supplierId: record.supplierId,
         supplierName: record.supplierName,
         supplierSlug: record.supplierSlug,
         supplierCode: record.supplierCode,
         contactEmail: record.contactEmail,
         contactPhone: record.contactPhone,
         address: record.address,
         city: record.city,
         rating: record.rating,
         isVerified: record.isVerified,
         supplierStatus: record.supplierStatus,
         supplierLogoUrl: record.supplierLogoUrl,
         version: record.version,
         deletedAt: record.deletedAt,
         createdAt: record.createdAt,
         updatedAt: record.updatedAt,
      };
   }

   async findById(supplierId: string): Promise<SupplierEntity | null> {
      const record = await this.prisma.supplier.findFirst({
         where: { supplierId, deletedAt: null },
      });
      return record ? this.mapPrismaToEntity(record) : null;
   }

   async findBySlug(slug: string): Promise<SupplierEntity | null> {
      const record = await this.prisma.supplier.findFirst({
         where: { supplierSlug: slug, deletedAt: null },
      });
      return record ? this.mapPrismaToEntity(record) : null;
   }

   async findByCode(code: string): Promise<SupplierEntity | null> {
      const record = await this.prisma.supplier.findFirst({
         where: { supplierCode: code, deletedAt: null },
      });
      return record ? this.mapPrismaToEntity(record) : null;
   }

   async findActive(): Promise<SupplierEntity[]> {
      const records = await this.prisma.supplier.findMany({
         where: { supplierStatus: SUPPLIER_STATUS.ACTIVE, deletedAt: null },
         orderBy: { rating: 'desc' },
      });
      return records.map((r) => this.mapPrismaToEntity(r));
   }

   async create(data: CreateSupplierData): Promise<SupplierEntity> {
      const record = await this.prisma.supplier.create({
         data: {
            supplierName: data.supplierName,
            supplierSlug: data.supplierSlug,
            supplierCode: data.supplierCode,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            address: data.address,
            city: data.city,
            rating: data.rating ?? 5.0,
            isVerified: data.isVerified ?? false,
            supplierStatus: SUPPLIER_STATUS.ACTIVE,
            supplierLogoUrl: data.supplierLogoUrl,
         },
      });
      return this.mapPrismaToEntity(record);
   }

   async update(supplierId: string, data: UpdateSupplierData): Promise<SupplierEntity | null> {
      const record = await this.prisma.supplier.update({
         where: { supplierId },
         data: {
            ...(data.supplierName ? { supplierName: data.supplierName } : {}),
            ...(data.supplierSlug ? { supplierSlug: data.supplierSlug } : {}),
            ...(data.contactEmail !== undefined ? { contactEmail: data.contactEmail } : {}),
            ...(data.contactPhone !== undefined ? { contactPhone: data.contactPhone } : {}),
            ...(data.address !== undefined ? { address: data.address } : {}),
            ...(data.city !== undefined ? { city: data.city } : {}),
            ...(data.rating !== undefined ? { rating: data.rating } : {}),
            ...(data.isVerified !== undefined ? { isVerified: data.isVerified } : {}),
            ...(data.supplierStatus ? { supplierStatus: data.supplierStatus as SupplierStatus } : {}),
            ...(data.supplierLogoUrl !== undefined ? { supplierLogoUrl: data.supplierLogoUrl } : {}),
            version: { increment: 1 },
         },
      });
      return this.mapPrismaToEntity(record);
   }

   async softDelete(supplierId: string): Promise<boolean> {
      const res = await this.prisma.supplier.update({
         where: { supplierId },
         data: {
            deletedAt: new Date(),
            version: { increment: 1 },
         },
      });
      return !!res;
   }
}
