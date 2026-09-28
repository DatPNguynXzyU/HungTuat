import type { CreateSessionData, UserSessionEntity } from '@auth/entities/session.entity';

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

export interface ISessionRepository {
   createSession(data: CreateSessionData): Promise<UserSessionEntity>;
   findById(id: string): Promise<UserSessionEntity | null>;
   findByJti(refreshTokenJti: string): Promise<UserSessionEntity | null>;
   findActiveSessionsByUserId(userId: string): Promise<UserSessionEntity[]>;
   updateSession(id: string, data: Partial<UserSessionEntity>): Promise<UserSessionEntity | null>;
   updateSessionByJti(refreshTokenJti: string, data: Partial<UserSessionEntity>): Promise<UserSessionEntity | null>;
   revokeSession(id: string, userId: string): Promise<UserSessionEntity | null>;
   revokeOtherSessions(userId: string, currentJti: string): Promise<string[]>; // Returns list of revoked JTIs
   revokeAllSessions(userId: string): Promise<string[]>; // Returns list of revoked JTIs
}
