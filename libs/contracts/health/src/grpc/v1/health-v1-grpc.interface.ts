import type { Observable } from 'rxjs';
import type { ServingStatus } from '@contracts/health/constants/grpc.constant';

export interface IHealthCheckRequest {
   service?: string;
}

export interface IHealthCheckResponse {
   status: ServingStatus;
}

export interface IHealthGrpcService {
   check(request: IHealthCheckRequest): Observable<IHealthCheckResponse>;
   watch(request: IHealthCheckRequest): Observable<IHealthCheckResponse>;
}

// Aliases for explicit versioning
export type IHealthV1GrpcService = IHealthGrpcService;
export type IHealthCheckRequestV1 = IHealthCheckRequest;
export type IHealthCheckResponseV1 = IHealthCheckResponse;
