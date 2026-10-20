import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';

export interface ICheckEmailRequest {
   email: string;
}

export interface ICheckEmailResponse {
   available: boolean;
   email: string;
}

export interface IAuthV1GrpcService {
   checkEmail(request: ICheckEmailRequest, metadata?: Metadata): Observable<ICheckEmailResponse>;
}

// Aliases for compatibility
export type IAuthGrpcService = IAuthV1GrpcService;
export type ICheckEmailRequestV1 = ICheckEmailRequest;
export type ICheckEmailResponseV1 = ICheckEmailResponse;
