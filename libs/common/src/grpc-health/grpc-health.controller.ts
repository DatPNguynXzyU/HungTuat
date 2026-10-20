import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { from, type Observable } from 'rxjs';
import {
   HEALTH_GRPC_METHODS,
   HEALTH_GRPC_SERVICE_NAME,
   type IHealthCheckRequest,
   type IHealthCheckResponse,
   type IHealthGrpcService,
} from '@contracts/health';
import { GrpcHealthService } from '@common/grpc-health/grpc-health.service';

/**
 * Inbound Adapter (Hexagonal Architecture) handling incoming gRPC Health requests.
 * Adapts gRPC transport calls into domain GrpcHealthService executions.
 */
@Controller()
export class GrpcHealthController implements IHealthGrpcService {
   constructor(private readonly healthService: GrpcHealthService) {}

   @GrpcMethod(HEALTH_GRPC_SERVICE_NAME, HEALTH_GRPC_METHODS.CHECK)
   check(request: IHealthCheckRequest): Observable<IHealthCheckResponse> {
      return from(this.healthService.check(request?.service));
   }

   @GrpcMethod(HEALTH_GRPC_SERVICE_NAME, HEALTH_GRPC_METHODS.WATCH)
   watch(request: IHealthCheckRequest): Observable<IHealthCheckResponse> {
      return this.healthService.watch(request?.service);
   }
}
