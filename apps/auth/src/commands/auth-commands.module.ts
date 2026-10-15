import { Module, type OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { COMMAND_BUS, CommandBus, type ICommandHandler } from '@common';
import { AUTH_COMMAND_HANDLERS } from '@auth/commands';
import {
   AuthAccountService,
   AuthCoreService,
   AuthLoginService,
   AuthRbacService,
   AuthRegistrationService,
   AuthTokenService,
   PasswordManagementService,
   SessionManagementService,
} from '@auth/services/domain';
import { AuditLogService } from '@auth/services/infrastructure';

@Module({
   providers: [
      CommandBus,
      {
         provide: COMMAND_BUS,
         useExisting: CommandBus,
      },
      ...AUTH_COMMAND_HANDLERS,
      // Underlying domain & infrastructure services required by handlers
      AuthCoreService,
      AuthRegistrationService,
      SessionManagementService,
      PasswordManagementService,
      AuthRbacService,
      AuthAccountService,
      AuthLoginService,
      AuthTokenService,
      AuditLogService,
   ],
   exports: [CommandBus, COMMAND_BUS, ...AUTH_COMMAND_HANDLERS],
})
export class AuthCommandsModule implements OnModuleInit {
   constructor(
      private readonly commandBus: CommandBus,
      private readonly moduleRef: ModuleRef,
   ) {}

   onModuleInit(): void {
      for (const handlerClass of AUTH_COMMAND_HANDLERS) {
         const handler = this.moduleRef.get<ICommandHandler<never, never>>(handlerClass, { strict: false });
         if (handler) {
            this.commandBus.registerHandler(handler);
         }
      }
   }
}
