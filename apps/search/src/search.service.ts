import { Injectable } from '@nestjs/common';
import { UserSearchService } from '@search/domains/user-search';

@Injectable()
export class SearchService {
   constructor(private readonly userSearchService: UserSearchService) {}

   async indexUser(user: Parameters<UserSearchService['indexUser']>[0]): Promise<void> {
      await this.userSearchService.indexUser(user);
   }

   async updateUser(user: Parameters<UserSearchService['updateUser']>[0]): Promise<void> {
      await this.userSearchService.updateUser(user);
   }

   async deleteUser(userId: string): Promise<void> {
      await this.userSearchService.deleteUser(userId);
   }

   async searchUsers(query: string, limit = 20, cursor?: string) {
      return this.userSearchService.searchUsers(query, limit, cursor);
   }
}
