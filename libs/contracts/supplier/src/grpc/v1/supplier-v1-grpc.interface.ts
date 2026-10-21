import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import type {
   IGetSupplierByIdRequest,
   IGetSupplierByIdResponse,
   IGetSuppliersByIdsRequest,
   IGetSuppliersByIdsResponse,
   IListSuppliersRequest,
   IListSuppliersResponse,
   IRegisterSupplierRequest,
   IRegisterSupplierResponse,
   IUpdateSupplierRequest,
   IUpdateSupplierResponse,
   IVerifySupplierRequest,
   IVerifySupplierResponse,
} from '@contracts/supplier/grpc/v1/messages';

export interface ISupplierV1GrpcService {
   getSupplierById(request: IGetSupplierByIdRequest, metadata?: Metadata): Observable<IGetSupplierByIdResponse>;

   getSuppliersByIds(request: IGetSuppliersByIdsRequest, metadata?: Metadata): Observable<IGetSuppliersByIdsResponse>;

   listSuppliers(request: IListSuppliersRequest, metadata?: Metadata): Observable<IListSuppliersResponse>;

   registerSupplier(request: IRegisterSupplierRequest, metadata?: Metadata): Observable<IRegisterSupplierResponse>;

   updateSupplier(request: IUpdateSupplierRequest, metadata?: Metadata): Observable<IUpdateSupplierResponse>;

   verifySupplier(request: IVerifySupplierRequest, metadata?: Metadata): Observable<IVerifySupplierResponse>;
}

export type ISupplierGrpcService = ISupplierV1GrpcService;
