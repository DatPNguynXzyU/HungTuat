import { Gender } from '@user/core/database/entities';

export interface UpdateProfileDto {
   username?: string;
   displayName?: string;
   bio?: string;
   avatar?: string;
   coverImage?: string;
   website?: string;
   location?: string;
   dateOfBirth?: Date;
   gender?: Gender;
}
