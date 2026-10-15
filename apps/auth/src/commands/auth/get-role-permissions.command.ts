import { Command } from '@common';

export class GetRolePermissionsCommand extends Command<string[]> {
   constructor(public readonly roleCode: string) {
      super();
   }
}
