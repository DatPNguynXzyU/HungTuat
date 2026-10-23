import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { defer, firstValueFrom } from 'rxjs';
import { CircuitBreakerRegistry, RetryPolicyRegistry, withGrpcRetry } from '@common';
import {
   SUPPLIER_V1_GRPC_CLIENT,
   SUPPLIER_V1_GRPC_SERVICE_NAME,
   type ISupplierProto,
   type ISupplierV1GrpcService,
   type SupplierItemDto,
   type SupplierStatusType,
} from '@contracts/supplier';
import type { ISupplierAdapter } from '@commerce/adapters/supplier/supplier.adapter.interface';

@Injectable()
export class GrpcSupplierAdapter implements ISupplierAdapter, OnModuleInit {
   private supplierGrpcService!: ISupplierV1GrpcService;
   private readonly breaker = CircuitBreakerRegistry.getOrCreate(SUPPLIER_V1_GRPC_SERVICE_NAME, {
      timeout: 3000,
      failureThreshold: 5,
      resetTimeout: 10000,
   });
   private readonly retryPolicy = RetryPolicyRegistry.getOrCreate(SUPPLIER_V1_GRPC_SERVICE_NAME, {
      maxAttempts: 3,
      initialDelayMs: 100,
      multiplier: 2,
      maxDelayMs: 2000,
   });

   constructor(@Inject(SUPPLIER_V1_GRPC_CLIENT) private readonly supplierGrpcClient: ClientGrpc) {}

   onModuleInit(): void {
      this.supplierGrpcService =
         this.supplierGrpcClient.getService<ISupplierV1GrpcService>(SUPPLIER_V1_GRPC_SERVICE_NAME);
   }

   private mapProtoToDto(proto: ISupplierProto): SupplierItemDto {
      return {
         supplierId: proto.supplierId,
         supplierName: proto.supplierName,
         supplierSlug: proto.supplierSlug,
         supplierCode: proto.supplierCode,
         contactEmail: proto.contactEmail || undefined,
         contactPhone: proto.contactPhone || undefined,
         address: proto.address || undefined,
         city: proto.city || undefined,
         rating: proto.rating,
         isVerified: proto.isVerified,
         supplierStatus: proto.supplierStatus as SupplierStatusType,
         supplierLogoUrl: proto.supplierLogoUrl || undefined,
      };
   }

   async getSupplierById(supplierId: string): Promise<SupplierItemDto | null> {
      try {
         return await this.breaker.execute(async () => {
            const res = await firstValueFrom(
               defer(() => this.supplierGrpcService.getSupplierById({ supplierId })).pipe(
                  withGrpcRetry(this.retryPolicy),
               ),
            );
            return res.supplier ? this.mapProtoToDto(res.supplier) : null;
         });
      } catch {
         return null;
      }
   }

   async getSuppliersByIds(supplierIds: string[]): Promise<Map<string, SupplierItemDto>> {
      const map = new Map<string, SupplierItemDto>();
      if (!supplierIds.length) {
         return map;
      }

      try {
         const res = await this.breaker.execute(async () => {
            return await firstValueFrom(
               defer(() => this.supplierGrpcService.getSuppliersByIds({ supplierIds })).pipe(
                  withGrpcRetry(this.retryPolicy),
               ),
            );
         });

         for (const supp of res.suppliers || []) {
            map.set(supp.supplierId, this.mapProtoToDto(supp));
         }
      } catch {
         // Fallback gracefully on circuit breaker trip or RPC error
      }

      return map;
   }

   async getMySupplier(accountId: string): Promise<{ hasSupplier: boolean; supplierId?: string }> {
      try {
         return await this.breaker.execute(async () => {
            const res = await firstValueFrom(
               defer(() => this.supplierGrpcService.getMySupplier({ accountId })).pipe(withGrpcRetry(this.retryPolicy)),
            );
            return {
               hasSupplier: res.hasSupplier,
               supplierId: res.supplier?.supplierId,
            };
         });
      } catch {
         return { hasSupplier: false };
      }
   }
}
