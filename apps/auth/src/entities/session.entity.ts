import type { SetOptional } from '@common';

export interface SessionEntity {
   id: string;
   accountId: string;
   refreshTokenJti: string;
   deviceType?: string | null;
   deviceName?: string | null;
   browser?: string | null;
   os?: string | null;
   userAgent?: string | null;
   ipAddress?: string | null;
   city?: string | null;
   region?: string | null;
   country?: string | null;
   countryCode?: string | null;
   deviceId?: string | null;
   clientType?: string | null;
   appVersion?: string | null;
   isRevoked: boolean;
   lastActiveAt: string;
   expiresAt: string;
   createdAt: string;
   updatedAt?: string;
}

export type CreateSessionData = SetOptional<
   SessionEntity,
   'id' | 'createdAt' | 'updatedAt' | 'isRevoked' | 'lastActiveAt'
>;
