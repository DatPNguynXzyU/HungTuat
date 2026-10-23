import { Command } from '@common';
import type { IPermissionDefinition } from '@contracts/auth';

export class RegisterServicePermissionsCommand extends Command<number> {
   constructor(
      public readonly serviceName: string,
      public readonly permissions: IPermissionDefinition[],
   ) {
      super();
   }
}
