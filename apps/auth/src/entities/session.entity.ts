export interface UserSessionEntity {
   id: string;
   userId: string;
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
   isRevoked: boolean;
   lastActiveAt: string;
   expiresAt: string;
   createdAt: string;
   updatedAt?: string;
}

export type CreateSessionData = Omit<
   UserSessionEntity,
   'id' | 'createdAt' | 'updatedAt' | 'isRevoked' | 'lastActiveAt'
> & {
   id?: string;
   isRevoked?: boolean;
   lastActiveAt?: string;
   createdAt?: string;
   updatedAt?: string;
};
