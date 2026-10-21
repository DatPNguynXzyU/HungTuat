import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ConflictException, NotFoundException } from '@common';
import {
   COMMERCE_ERROR_CODES,
   COMMERCE_EVENTS,
   CurrencyEnum,
   INGREDIENT_STATUS,
   SUPPLIER_STATUS,
   type CreateProductOfferDto,
   type RegisterSupplierDto,
} from '@contracts/commerce';
import {
   INGREDIENT_REPOSITORY,
   SUPPLIER_PRODUCT_REPOSITORY,
   SUPPLIER_REPOSITORY,
   type IIngredientRepository,
   type ISupplierProductRepository,
   type ISupplierRepository,
} from '@commerce/repositories';
import { Money, Sku, Slug } from '@commerce/domain/value-objects';
import { ProductOfferCreatedEvent, ProductStockUpdatedEvent, SupplierRegisteredEvent } from '@commerce/domain/events';
import type { SupplierEntity } from '@commerce/entities/supplier.entity';
import type { SupplierProductEntity } from '@commerce/entities/supplier-product.entity';

@Injectable()
export class SupplierOfferService {
   constructor(
      @Inject(SUPPLIER_REPOSITORY)
      private readonly supplierRepository: ISupplierRepository,
      @Inject(INGREDIENT_REPOSITORY)
      private readonly ingredientRepository: IIngredientRepository,
      @Inject(SUPPLIER_PRODUCT_REPOSITORY)
      private readonly supplierProductRepository: ISupplierProductRepository,
      private readonly eventEmitter: EventEmitter2,
   ) {}

   async getSuppliersByIngredient(
      ingredientId: string,
      inStockOnly: boolean = false,
   ): Promise<{
      ingredientId: string;
      ingredientName: string;
      offers: SupplierProductEntity[];
      totalOffers: number;
   }> {
      const ingredient = await this.ingredientRepository.findById(ingredientId);
      if (!ingredient) {
         throw new NotFoundException(COMMERCE_ERROR_CODES.INGREDIENT_NOT_FOUND, {
            params: { ingredientId },
         });
      }

      const offers = await this.supplierProductRepository.findByIngredientId(ingredientId, inStockOnly);

      return {
         ingredientId: ingredient.ingredientId,
         ingredientName: ingredient.ingredientName,
         offers,
         totalOffers: offers.length,
      };
   }

   async getProductById(productId: string): Promise<SupplierProductEntity> {
      const product = await this.supplierProductRepository.findById(productId);
      if (!product) {
         throw new NotFoundException(COMMERCE_ERROR_CODES.PRODUCT_OFFER_NOT_FOUND, {
            params: { productId },
         });
      }
      return product;
   }

   async registerSupplier(dto: RegisterSupplierDto): Promise<SupplierEntity> {
      const cleanCode = dto.supplierCode.trim().toUpperCase();
      const existingByCode = await this.supplierRepository.findByCode(cleanCode);
      if (existingByCode) {
         throw new ConflictException(COMMERCE_ERROR_CODES.SUPPLIER_ALREADY_EXISTS, {
            params: { code: cleanCode },
         });
      }

      const generatedSlug = new Slug(dto.supplierName).value;

      const created = await this.supplierRepository.create({
         supplierName: dto.supplierName.trim(),
         supplierSlug: generatedSlug,
         supplierCode: cleanCode,
         contactEmail: dto.contactEmail?.trim(),
         contactPhone: dto.contactPhone?.trim(),
         address: dto.address?.trim(),
         city: dto.city?.trim(),
         supplierLogoUrl: dto.supplierLogoUrl,
         isVerified: true,
         supplierStatus: SUPPLIER_STATUS.ACTIVE,
      });

      this.eventEmitter.emit(
         COMMERCE_EVENTS.SUPPLIER_REGISTERED,
         new SupplierRegisteredEvent(created.supplierId, created.supplierName, created.supplierCode),
      );

      return created;
   }

   async createProductOffer(dto: CreateProductOfferDto): Promise<SupplierProductEntity> {
      const supplier = await this.supplierRepository.findById(dto.supplierId);
      if (!supplier || supplier.supplierStatus !== SUPPLIER_STATUS.ACTIVE) {
         throw new NotFoundException(COMMERCE_ERROR_CODES.SUPPLIER_NOT_FOUND, {
            params: { supplierId: dto.supplierId },
         });
      }

      const ingredient = await this.ingredientRepository.findById(dto.ingredientId);
      if (!ingredient || ingredient.ingredientStatus !== INGREDIENT_STATUS.ACTIVE) {
         throw new NotFoundException(COMMERCE_ERROR_CODES.INGREDIENT_NOT_FOUND, {
            params: { ingredientId: dto.ingredientId },
         });
      }

      const validSku = new Sku(dto.productSku).value;
      const validMoney = new Money(dto.price, dto.currency ?? CurrencyEnum.VND);

      const existingOffer = await this.supplierProductRepository.findBySupplierAndSku(dto.supplierId, validSku);
      if (existingOffer) {
         throw new ConflictException(COMMERCE_ERROR_CODES.PRODUCT_OFFER_ALREADY_EXISTS, {
            params: { supplierId: dto.supplierId, sku: validSku },
         });
      }

      const created = await this.supplierProductRepository.create({
         supplierId: dto.supplierId,
         ingredientId: dto.ingredientId,
         productSku: validSku,
         productTitle: dto.productTitle.trim(),
         price: validMoney.amount,
         currency: validMoney.currency,
         originalPrice: dto.originalPrice
            ? new Money(dto.originalPrice, dto.currency ?? CurrencyEnum.VND).amount
            : null,
         packageSize: dto.packageSize?.trim(),
         stockQuantity: dto.stockQuantity ?? 0,
         productUrl: dto.productUrl?.trim(),
         productImageUrl: dto.productImageUrl?.trim(),
      });

      this.eventEmitter.emit(
         COMMERCE_EVENTS.PRODUCT_OFFER_CREATED,
         new ProductOfferCreatedEvent(
            created.productId,
            created.supplierId,
            created.ingredientId,
            created.productSku,
            created.price,
         ),
      );

      return created;
   }

   async updateProductStock(productId: string, quantity: number): Promise<SupplierProductEntity> {
      if (quantity < 0) {
         throw new BadRequestException(COMMERCE_ERROR_CODES.INVALID_STOCK, {
            params: { quantity },
         });
      }

      const existing = await this.supplierProductRepository.findById(productId);
      if (!existing) {
         throw new NotFoundException(COMMERCE_ERROR_CODES.PRODUCT_OFFER_NOT_FOUND, {
            params: { productId },
         });
      }

      const updated = await this.supplierProductRepository.updateStock(productId, quantity);
      if (!updated) {
         throw new NotFoundException(COMMERCE_ERROR_CODES.PRODUCT_OFFER_NOT_FOUND, {
            params: { productId },
         });
      }

      this.eventEmitter.emit(
         COMMERCE_EVENTS.PRODUCT_STOCK_UPDATED,
         new ProductStockUpdatedEvent(productId, existing.stockQuantity, quantity),
      );

      return updated;
   }
}
