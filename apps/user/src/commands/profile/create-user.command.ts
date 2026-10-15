import { Command } from '@common';
import type { Gender, UserEntity } from '@user/core/database/entities';

export interface CreateUserDataPayload {
   accountId: string;
   username?: string;
   displayName?: string;
   gender?: Gender;
   dateOfBirth?: string | Date;
   bio?: string;
   avatar?: string;
   coverImage?: string;
   website?: string;
   location?: string;
}

export class CreateUserCommand extends Command<UserEntity> {
   constructor(public readonly data: CreateUserDataPayload) {
      super();
   }
}
