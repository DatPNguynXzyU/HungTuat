import { Command } from '@common';
import type { DeviceSessionResponseDto } from '@contracts/auth';

export class GetSessionsCommand extends Command<DeviceSessionResponseDto[]> {
   constructor(
      public readonly accountId?: string,
      public readonly userId?: string,
      public readonly currentJti?: string,
   ) {
      super();
   }
}
