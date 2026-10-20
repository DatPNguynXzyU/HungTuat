import { Controller, UseFilters, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { from, type Observable } from 'rxjs';
import { CommandBus, GrpcExceptionFilter, GrpcLoggingInterceptor, GrpcMetricsInterceptor } from '@common';
import {
   AUTH_V1_GRPC_METHODS,
   AUTH_V1_GRPC_SERVICE_NAME,
   type IAuthV1GrpcService,
   type ICheckEmailRequest,
   type ICheckEmailResponse,
} from '@contracts/auth';
import { CheckEmailCommand } from '@auth/commands/registration/check-email.command';

/**
 * Inbound Adapter (Hexagonal Architecture) handling incoming gRPC requests for Auth V1.
 * Adapts gRPC CheckEmailRequest into domain CheckEmailCommand and delegates to CommandBus.
 */
@Controller()
@UseFilters(new GrpcExceptionFilter())
@UseInterceptors(GrpcLoggingInterceptor, GrpcMetricsInterceptor)
export class AuthGrpcController implements IAuthV1GrpcService {
   constructor(private readonly commandBus: CommandBus) {}

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.CHECK_EMAIL)
   checkEmail(data: ICheckEmailRequest): Observable<ICheckEmailResponse> {
      return from(this.commandBus.execute(new CheckEmailCommand(data.email)));
   }
}
