import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import type {
   ICheckEmailRequest,
   ICheckEmailResponse,
   ILoginRequest,
   ILoginResponse,
   IRefreshTokenRequest,
   IRefreshTokenResponse,
} from '@contracts/auth/grpc/v1/messages';

export interface IAuthV1GrpcService {
   checkEmail(request: ICheckEmailRequest, metadata?: Metadata): Observable<ICheckEmailResponse>;
   login(request: ILoginRequest, metadata?: Metadata): Observable<ILoginResponse>;
   refreshToken(request: IRefreshTokenRequest, metadata?: Metadata): Observable<IRefreshTokenResponse>;
}

// Aliases for compatibility
export type IAuthGrpcService = IAuthV1GrpcService;
