import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';

export interface ICheckUsernameRequest {
   username: string;
}

export interface ICheckUsernameResponse {
   available: boolean;
   username: string;
}

export interface IUserV1GrpcService {
   checkUsername(request: ICheckUsernameRequest, metadata?: Metadata): Observable<ICheckUsernameResponse>;
}

// Aliases for compatibility
export type IUserGrpcService = IUserV1GrpcService;
export type ICheckUsernameRequestV1 = ICheckUsernameRequest;
export type ICheckUsernameResponseV1 = ICheckUsernameResponse;
