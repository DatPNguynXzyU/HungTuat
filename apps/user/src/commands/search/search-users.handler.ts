import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { UserSearchResponseDto } from '@contracts/user';
import { UserSearchService } from '@user/services/domain/user-search.service';
import { SearchUsersCommand } from '@user/commands/search/search-users.command';

@Injectable()
@CommandHandler(SearchUsersCommand)
export class SearchUsersHandler implements ICommandHandler<SearchUsersCommand, UserSearchResponseDto> {
   constructor(private readonly userSearchService: UserSearchService) {}

   async execute(command: SearchUsersCommand): Promise<UserSearchResponseDto> {
      return this.userSearchService.searchUsers(command.query, command.limit, command.cursor, command.currentUserId);
   }
}
