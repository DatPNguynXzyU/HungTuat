import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { IJwksResponse } from '@contracts/auth';
import { AuthCoreService } from '@auth/services/domain';
import { GetJwksCommand } from '@auth/commands/auth/get-jwks.command';

@Injectable()
@CommandHandler(GetJwksCommand)
export class GetJwksHandler implements ICommandHandler<GetJwksCommand, IJwksResponse> {
   constructor(private readonly authCoreService: AuthCoreService) {}

   execute(): IJwksResponse {
      return this.authCoreService.getJwks();
   }
}
