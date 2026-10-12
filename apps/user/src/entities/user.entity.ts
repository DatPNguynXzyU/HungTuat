import {
   User as PrismaUser,
   UserProfile as PrismaUserProfile,
   UserStats as PrismaUserStats,
   UserSettings as PrismaUserSettings,
   Gender,
   UserStatus,
} from '@user/prisma-client';

export class UserProfileEntity implements Omit<PrismaUserProfile, 'dateOfBirth' | 'gender'> {
   profileId: string;
   get id(): string {
      return this.profileId;
   }
   set id(val: string) {
      this.profileId = val;
   }
   userId: string;
   displayName: string | null;
   bio: string | null;
   avatar: string | null;
   coverImage: string | null;
   website: string | null;
   location: string | null;
   createdAt: Date;
   updatedAt: Date;

   constructor(partial: Partial<PrismaUserProfile & { id?: string }>) {
      const rest = { ...partial };
      delete (rest as { dateOfBirth?: unknown }).dateOfBirth;
      delete (rest as { gender?: unknown }).gender;
      if (rest.id && !rest.profileId) {
         rest.profileId = rest.id;
      }
      Object.assign(this, rest);
   }
}

export class UserStatsEntity implements PrismaUserStats {
   statsId: string;
   get id(): string {
      return this.statsId;
   }
   set id(val: string) {
      this.statsId = val;
   }
   userId: string;
   followersCount: number;
   followingCount: number;
   postsCount: number;
   recipesCount: number;
   createdAt: Date;
   updatedAt: Date;

   constructor(partial: Partial<UserStatsEntity & { statsId?: string }>) {
      const rest = { ...partial };
      if (rest.id && !rest.statsId) {
         rest.statsId = rest.id;
      }
      Object.assign(this, rest);
   }
}

export class UserSettingsEntity implements PrismaUserSettings {
   settingsId: string;
   get id(): string {
      return this.settingsId;
   }
   set id(val: string) {
      this.settingsId = val;
   }
   userId: string;
   isVerified: boolean;
   isPrivate: boolean;
   createdAt: Date;
   updatedAt: Date;

   constructor(partial: Partial<UserSettingsEntity & { settingsId?: string }>) {
      const rest = { ...partial };
      if (rest.id && !rest.settingsId) {
         rest.settingsId = rest.id;
      }
      Object.assign(this, rest);
   }
}

export type UserEntityInput = Partial<Omit<UserEntity, 'profile' | 'stats' | 'settings'>> & {
   dateOfBirth?: unknown;
   gender?: unknown;
   profile?: Partial<PrismaUserProfile> | UserProfileEntity | null;
   stats?: Partial<PrismaUserStats> | UserStatsEntity | null;
   settings?: Partial<PrismaUserSettings> | UserSettingsEntity | null;
};

export class UserEntity implements PrismaUser {
   userId: string;
   get id(): string {
      return this.userId;
   }
   set id(val: string) {
      this.userId = val;
   }
   accountId: string;
   username: string | null;
   status: UserStatus;
   deletedAt: Date | null;
   createdAt: Date;
   updatedAt: Date;
   lastActiveAt: Date | null;

   profile?: UserProfileEntity | null;
   stats?: UserStatsEntity | null;
   settings?: UserSettingsEntity | null;

   get displayName(): string | null {
      return this.profile?.displayName ?? null;
   }

   get bio(): string | null {
      return this.profile?.bio ?? null;
   }

   get avatar(): string | null {
      return this.profile?.avatar ?? null;
   }

   get coverImage(): string | null {
      return this.profile?.coverImage ?? null;
   }

   get website(): string | null {
      return this.profile?.website ?? null;
   }

   get location(): string | null {
      return this.profile?.location ?? null;
   }

   get followersCount(): number {
      return this.stats?.followersCount ?? 0;
   }

   get followingCount(): number {
      return this.stats?.followingCount ?? 0;
   }

   get postsCount(): number {
      return this.stats?.postsCount ?? 0;
   }

   get recipesCount(): number {
      return this.stats?.recipesCount ?? 0;
   }

   get isVerified(): boolean {
      return this.settings?.isVerified ?? false;
   }

   get isPrivate(): boolean {
      return this.settings?.isPrivate ?? false;
   }

   constructor(partial: UserEntityInput) {
      const rest = { ...partial } as Partial<UserEntity> & {
         dateOfBirth?: unknown;
         gender?: unknown;
         id?: string;
      };
      delete rest.dateOfBirth;
      delete rest.gender;
      if (rest.id && !rest.userId) {
         rest.userId = rest.id;
      }
      Object.assign(this, rest);
      if (partial.profile) {
         this.profile = new UserProfileEntity(partial.profile);
      }
      if (partial.stats) {
         this.stats = new UserStatsEntity(partial.stats);
      }
      if (partial.settings) {
         this.settings = new UserSettingsEntity(partial.settings);
      }
   }
}

export { Gender, UserStatus };
