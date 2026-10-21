import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { defer, firstValueFrom } from 'rxjs';
import {
   CircuitBreakerRegistry,
   createGrpcMetadata,
   handleGrpcError,
   RetryPolicyRegistry,
   SERVICE_NAMES,
   withGrpcRetry,
} from '@common';
import {
   SUPPLIER_V1_GRPC_CLIENT,
   SUPPLIER_V1_GRPC_SERVICE_NAME,
   type IRegisterSupplierRequest,
   type ISupplierProto,
   type ISupplierV1GrpcService,
   type RegisterSupplierDto,
   type SupplierItemDto,
   type SupplierStatusType,
} from '@contracts/supplier';

@Injectable()
export class SuppliersService implements OnModuleInit {
   private supplierGrpcService!: ISupplierV1GrpcService;
   private readonly supplierGrpcBreaker = CircuitBreakerRegistry.getOrCreate(SUPPLIER_V1_GRPC_SERVICE_NAME, {
      timeout: 5000,
      failureThreshold: 5,
      resetTimeout: 10000,
   });
   private readonly supplierGrpcRetryPolicy = RetryPolicyRegistry.getOrCreate(SUPPLIER_V1_GRPC_SERVICE_NAME, {
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

   private mapProtoToDto(supp: ISupplierProto): SupplierItemDto {
      return {
         supplierId: supp.supplierId,
         supplierName: supp.supplierName,
         supplierSlug: supp.supplierSlug,
         supplierCode: supp.supplierCode,
         contactEmail: supp.contactEmail || undefined,
         contactPhone: supp.contactPhone || undefined,
         address: supp.address || undefined,
         city: supp.city || undefined,
         rating: supp.rating,
         isVerified: supp.isVerified,
         supplierStatus: supp.supplierStatus as SupplierStatusType,
         supplierLogoUrl: supp.supplierLogoUrl || undefined,
      };
   }

   /**
    * Registers a new supplier in the Supplier Microservice via gRPC.
    * Forwards caller context and authorization header so that auth is verified at the Supplier Service.
    */
   async registerSupplier(
      dto: RegisterSupplierDto,
      options?: { authHeader?: string; correlationId?: string },
   ): Promise<SupplierItemDto> {
      try {
         const metadata = createGrpcMetadata({
            correlationId: options?.correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });

         if (options?.authHeader) {
            metadata.set('authorization', options.authHeader);
            metadata.set('x-authorization', options.authHeader);
         }

         return await this.supplierGrpcBreaker.execute(async () => {
            const request: IRegisterSupplierRequest = {
               supplierName: dto.supplierName,
               supplierCode: dto.supplierCode,
               contactEmail: dto.contactEmail,
               contactPhone: dto.contactPhone,
               address: dto.address,
               city: dto.city,
               supplierLogoUrl: dto.supplierLogoUrl,
            };

            const res = await firstValueFrom(
               defer(() => this.supplierGrpcService.registerSupplier(request, metadata)).pipe(
                  withGrpcRetry(this.supplierGrpcRetryPolicy),
               ),
            );

            return this.mapProtoToDto(res.supplier);
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }
}
