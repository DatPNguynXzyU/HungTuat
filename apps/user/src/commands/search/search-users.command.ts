import { Command } from '@common';
import type { UserSearchResponseDto } from '@contracts/user';

export class SearchUsersCommand extends Command<UserSearchResponseDto> {
   constructor(
      public readonly query: string,
      public readonly limit?: number,
      public readonly cursor?: string,
      public readonly currentUserId?: string,
   ) {
      super();
   }
}
