import { Injectable } from '@nestjs/common';
import { CurrencyEnum, OFFER_STATUS } from '@contracts/commerce';
import { PrismaService } from '@commerce/prisma/prisma.service';
import type {
   CurrencyEnum as PrismaCurrencyEnum,
   OfferStatus as PrismaOfferStatus,
   Prisma,
} from '@commerce/prisma-client';
import type {
   CreateSupplierProductData,
   SupplierProductEntity,
   UpdateSupplierProductData,
} from '@commerce/entities/supplier-product.entity';
import type { ISupplierProductRepository } from '@commerce/repositories/supplier-product.repository.interface';

@Injectable()
export class SupplierProductRepository implements ISupplierProductRepository {
   constructor(private readonly prisma: PrismaService) {}

   private mapPrismaToEntity(record: {
      productId: string;
      supplierId: string;
      ingredientId: string;
      productSku: string;
      productTitle: string;
      price: Prisma.Decimal;
      currency: PrismaCurrencyEnum;
      originalPrice: Prisma.Decimal | null;
      packageSize: string | null;
      stockQuantity: number;
      productUrl: string | null;
      productImageUrl: string | null;
      offerStatus: string;
      version: number;
      deletedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
   }): SupplierProductEntity {
      return {
         productId: record.productId,
         supplierId: record.supplierId,
         ingredientId: record.ingredientId,
         productSku: record.productSku,
         productTitle: record.productTitle,
         price: Number(record.price),
         currency: record.currency,
         originalPrice: record.originalPrice ? Number(record.originalPrice) : null,
         packageSize: record.packageSize,
         stockQuantity: record.stockQuantity,
         productUrl: record.productUrl,
         productImageUrl: record.productImageUrl,
         offerStatus: record.offerStatus,
         version: record.version,
         deletedAt: record.deletedAt,
         createdAt: record.createdAt,
         updatedAt: record.updatedAt,
      };
   }

   async findById(productId: string): Promise<SupplierProductEntity | null> {
      const record = await this.prisma.supplierProduct.findFirst({
         where: { productId, deletedAt: null },
      });
      return record ? this.mapPrismaToEntity(record) : null;
   }

   async findBySupplierAndSku(supplierId: string, sku: string): Promise<SupplierProductEntity | null> {
      const record = await this.prisma.supplierProduct.findFirst({
         where: { supplierId, productSku: sku, deletedAt: null },
      });
      return record ? this.mapPrismaToEntity(record) : null;
   }

   async findByIngredientId(ingredientId: string, inStockOnly: boolean = false): Promise<SupplierProductEntity[]> {
      const where: Prisma.SupplierProductWhereInput = {
         ingredientId,
         deletedAt: null,
      };

      if (inStockOnly) {
         where.offerStatus = OFFER_STATUS.AVAILABLE;
         where.stockQuantity = { gt: 0 };
      }

      const records = await this.prisma.supplierProduct.findMany({
         where,
         orderBy: [{ offerStatus: 'asc' }, { price: 'asc' }],
      });

      return records.map((r) => this.mapPrismaToEntity(r));
   }

   async findBySupplierId(supplierId: string): Promise<SupplierProductEntity[]> {
      const records = await this.prisma.supplierProduct.findMany({
         where: { supplierId, deletedAt: null },
         orderBy: { createdAt: 'desc' },
      });
      return records.map((r) => this.mapPrismaToEntity(r));
   }

   async create(data: CreateSupplierProductData): Promise<SupplierProductEntity> {
      const record = await this.prisma.supplierProduct.create({
         data: {
            supplierId: data.supplierId,
            ingredientId: data.ingredientId,
            productSku: data.productSku,
            productTitle: data.productTitle,
            price: data.price,
            currency: (data.currency ?? CurrencyEnum.VND) as unknown as PrismaCurrencyEnum,
            originalPrice: data.originalPrice,
            packageSize: data.packageSize,
            stockQuantity: data.stockQuantity ?? 0,
            productUrl: data.productUrl,
            productImageUrl: data.productImageUrl,
            offerStatus: OFFER_STATUS.AVAILABLE,
         },
      });
      return this.mapPrismaToEntity(record);
   }

   async update(productId: string, data: UpdateSupplierProductData): Promise<SupplierProductEntity | null> {
      const record = await this.prisma.supplierProduct.update({
         where: { productId },
         data: {
            ...(data.productTitle ? { productTitle: data.productTitle } : {}),
            ...(data.price !== undefined ? { price: data.price } : {}),
            ...(data.currency ? { currency: data.currency as unknown as PrismaCurrencyEnum } : {}),
            ...(data.originalPrice !== undefined ? { originalPrice: data.originalPrice } : {}),
            ...(data.packageSize !== undefined ? { packageSize: data.packageSize } : {}),
            ...(data.stockQuantity !== undefined ? { stockQuantity: data.stockQuantity } : {}),
            ...(data.productUrl !== undefined ? { productUrl: data.productUrl } : {}),
            ...(data.productImageUrl !== undefined ? { productImageUrl: data.productImageUrl } : {}),
            ...(data.offerStatus ? { offerStatus: data.offerStatus as PrismaOfferStatus } : {}),
            version: { increment: 1 },
         },
      });
      return this.mapPrismaToEntity(record);
   }

   async updateStock(productId: string, quantity: number): Promise<SupplierProductEntity | null> {
      const newStatus = quantity > 0 ? OFFER_STATUS.AVAILABLE : OFFER_STATUS.OUT_OF_STOCK;
      const record = await this.prisma.supplierProduct.update({
         where: { productId },
         data: {
            stockQuantity: quantity,
            offerStatus: newStatus,
            version: { increment: 1 },
         },
      });
      return this.mapPrismaToEntity(record);
   }

   async softDelete(productId: string): Promise<boolean> {
      const res = await this.prisma.supplierProduct.update({
         where: { productId },
         data: {
            deletedAt: new Date(),
            version: { increment: 1 },
         },
      });
      return !!res;
   }
}
