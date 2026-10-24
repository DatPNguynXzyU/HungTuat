import type { SetOptional } from '@common';

export interface SessionEntity {
   sessionId: string;
   accountId: string;
   refreshTokenJti: string;
   refreshTokenHash?: string | null;
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
   'sessionId' | 'createdAt' | 'updatedAt' | 'isRevoked' | 'lastActiveAt'
>;
