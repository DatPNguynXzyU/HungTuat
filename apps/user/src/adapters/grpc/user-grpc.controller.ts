import { Controller, UseFilters, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { from, type Observable } from 'rxjs';
import { CommandBus, GrpcExceptionFilter, GrpcLoggingInterceptor, GrpcMetricsInterceptor } from '@common';
import {
   USER_V1_GRPC_METHODS,
   USER_V1_GRPC_SERVICE_NAME,
   type ICheckUsernameRequest,
   type ICheckUsernameResponse,
   type IUserV1GrpcService,
} from '@contracts/user';
import { CheckUsernameCommand } from '@user/commands/authentication/check-username.command';

/**
 * Inbound Adapter (Hexagonal Architecture) handling incoming gRPC requests for UserService.
 * Adapts gRPC CheckUsernameRequest into domain CheckUsernameCommand and delegates to CommandBus.
 */
@Controller()
@UseFilters(new GrpcExceptionFilter())
@UseInterceptors(GrpcLoggingInterceptor, GrpcMetricsInterceptor)
export class UserGrpcController implements IUserV1GrpcService {
   constructor(private readonly commandBus: CommandBus) {}

   @GrpcMethod(USER_V1_GRPC_SERVICE_NAME, USER_V1_GRPC_METHODS.CHECK_USERNAME)
   checkUsername(data: ICheckUsernameRequest): Observable<ICheckUsernameResponse> {
      return from(this.commandBus.execute(new CheckUsernameCommand(data.username)));
   }
}
