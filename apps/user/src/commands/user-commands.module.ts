import { Global, Module, type OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { COMMAND_BUS, CommandBus, type ICommandHandler } from '@common';
import { ProfileModule } from '@user/modules/profile/profile.module';
import { FollowModule } from '@user/modules/follow/follow.module';
import { SearchModule } from '@user/modules/search/search.module';
import { AuthenticationModule } from '@user/modules/authentication/auth.module';
import { USER_COMMAND_HANDLERS } from '@user/commands';

@Global()
@Module({
   imports: [ProfileModule, FollowModule, SearchModule, AuthenticationModule],
   providers: [
      CommandBus,
      {
         provide: COMMAND_BUS,
         useExisting: CommandBus,
      },
      ...USER_COMMAND_HANDLERS,
   ],
   exports: [CommandBus, COMMAND_BUS, ...USER_COMMAND_HANDLERS],
})
export class UserCommandsModule implements OnModuleInit {
   constructor(
      private readonly commandBus: CommandBus,
      private readonly moduleRef: ModuleRef,
   ) {}

   onModuleInit(): void {
      for (const handlerClass of USER_COMMAND_HANDLERS) {
         const handler = this.moduleRef.get<ICommandHandler<never, never>>(handlerClass, { strict: false });
         if (handler) {
            this.commandBus.registerHandler(handler);
         }
      }
   }
}
