import { Controller, UseFilters, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { from, type Observable } from 'rxjs';
import { CommandBus, GrpcExceptionFilter, GrpcLoggingInterceptor, GrpcMetricsInterceptor } from '@common';
import {
   SUPPLIER_V1_GRPC_METHODS,
   SUPPLIER_V1_GRPC_SERVICE_NAME,
   type IGetSupplierByIdRequest,
   type IGetSupplierByIdResponse,
   type IGetSuppliersByIdsRequest,
   type IGetSuppliersByIdsResponse,
   type IListSuppliersRequest,
   type IListSuppliersResponse,
   type IRegisterSupplierRequest,
   type IRegisterSupplierResponse,
   type ISupplierProto,
   type ISupplierV1GrpcService,
   type IUpdateSupplierRequest,
   type IUpdateSupplierResponse,
   type IVerifySupplierRequest,
   type IVerifySupplierResponse,
   type SupplierItemDto,
} from '@contracts/supplier';
import { RegisterSupplierCommand, UpdateSupplierCommand, VerifySupplierCommand } from '@supplier/commands';
import { GetSupplierByIdQuery, GetSuppliersByIdsQuery, ListSuppliersQuery } from '@supplier/queries';

@Controller()
@UseFilters(new GrpcExceptionFilter())
@UseInterceptors(GrpcLoggingInterceptor, GrpcMetricsInterceptor)
export class SupplierGrpcController implements ISupplierV1GrpcService {
   constructor(private readonly commandBus: CommandBus) {}

   private mapSupplierToProto(supplier: SupplierItemDto): ISupplierProto {
      return {
         supplierId: supplier.supplierId,
         supplierName: supplier.supplierName,
         supplierSlug: supplier.supplierSlug,
         supplierCode: supplier.supplierCode,
         contactEmail: supplier.contactEmail || '',
         contactPhone: supplier.contactPhone || '',
         address: supplier.address || '',
         city: supplier.city || '',
         rating: supplier.rating,
         isVerified: supplier.isVerified,
         supplierStatus: supplier.supplierStatus,
         supplierLogoUrl: supplier.supplierLogoUrl || '',
      };
   }

   @GrpcMethod(SUPPLIER_V1_GRPC_SERVICE_NAME, SUPPLIER_V1_GRPC_METHODS.GET_SUPPLIER_BY_ID)
   getSupplierById(data: IGetSupplierByIdRequest): Observable<IGetSupplierByIdResponse> {
      return from(
         this.commandBus.execute(new GetSupplierByIdQuery(data.supplierId)).then((supplier) => ({
            supplier: this.mapSupplierToProto(supplier),
         })),
      );
   }

   @GrpcMethod(SUPPLIER_V1_GRPC_SERVICE_NAME, SUPPLIER_V1_GRPC_METHODS.GET_SUPPLIERS_BY_IDS)
   getSuppliersByIds(data: IGetSuppliersByIdsRequest): Observable<IGetSuppliersByIdsResponse> {
      return from(
         this.commandBus.execute(new GetSuppliersByIdsQuery(data.supplierIds)).then((suppliers) => ({
            suppliers: suppliers.map((s) => this.mapSupplierToProto(s)),
         })),
      );
   }

   @GrpcMethod(SUPPLIER_V1_GRPC_SERVICE_NAME, SUPPLIER_V1_GRPC_METHODS.LIST_SUPPLIERS)
   listSuppliers(data: IListSuppliersRequest): Observable<IListSuppliersResponse> {
      return from(
         this.commandBus
            .execute(
               new ListSuppliersQuery({
                  status: data.status as never,
                  city: data.city,
                  limit: data.limit,
                  offset: data.offset,
               }),
            )
            .then((result) => ({
               suppliers: result.items.map((s) => this.mapSupplierToProto(s)),
               total: result.total,
            })),
      );
   }

   @GrpcMethod(SUPPLIER_V1_GRPC_SERVICE_NAME, SUPPLIER_V1_GRPC_METHODS.REGISTER_SUPPLIER)
   registerSupplier(data: IRegisterSupplierRequest): Observable<IRegisterSupplierResponse> {
      return from(
         this.commandBus
            .execute(
               new RegisterSupplierCommand({
                  supplierName: data.supplierName,
                  supplierCode: data.supplierCode,
                  contactEmail: data.contactEmail,
                  contactPhone: data.contactPhone,
                  address: data.address,
                  city: data.city,
                  supplierLogoUrl: data.supplierLogoUrl,
               }),
            )
            .then((supplier) => ({
               supplier: this.mapSupplierToProto(supplier),
            })),
      );
   }

   @GrpcMethod(SUPPLIER_V1_GRPC_SERVICE_NAME, SUPPLIER_V1_GRPC_METHODS.UPDATE_SUPPLIER)
   updateSupplier(data: IUpdateSupplierRequest): Observable<IUpdateSupplierResponse> {
      return from(
         this.commandBus
            .execute(
               new UpdateSupplierCommand(data.supplierId, {
                  supplierName: data.supplierName,
                  contactEmail: data.contactEmail,
                  contactPhone: data.contactPhone,
                  address: data.address,
                  city: data.city,
                  supplierLogoUrl: data.supplierLogoUrl,
                  supplierStatus: data.supplierStatus as never,
               }),
            )
            .then((supplier) => ({
               supplier: this.mapSupplierToProto(supplier),
            })),
      );
   }

   @GrpcMethod(SUPPLIER_V1_GRPC_SERVICE_NAME, SUPPLIER_V1_GRPC_METHODS.VERIFY_SUPPLIER)
   verifySupplier(data: IVerifySupplierRequest): Observable<IVerifySupplierResponse> {
      return from(
         this.commandBus.execute(new VerifySupplierCommand(data.supplierId, data.isVerified)).then((supplier) => ({
            supplier: this.mapSupplierToProto(supplier),
         })),
      );
   }
}
