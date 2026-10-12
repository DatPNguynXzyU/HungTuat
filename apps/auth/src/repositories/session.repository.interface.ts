import type { SessionEntity, CreateSessionData } from '@auth/entities/session.entity';

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

export interface ISessionRepository {
   createSession(data: CreateSessionData): Promise<SessionEntity>;
   findById(sessionId: string): Promise<SessionEntity | null>;
   findByJti(refreshTokenJti: string): Promise<SessionEntity | null>;
   findActiveSessionsByAccountId(accountId: string): Promise<SessionEntity[]>;
   updateSession(sessionId: string, data: Partial<SessionEntity>): Promise<SessionEntity | null>;
   updateSessionByJti(refreshTokenJti: string, data: Partial<SessionEntity>): Promise<SessionEntity | null>;
   revokeSession(sessionId: string, accountId: string): Promise<SessionEntity | null>;
   revokeSessionsByDeviceId(accountId: string, deviceId: string): Promise<string[]>;
   revokeOtherSessions(accountId: string, currentJti: string): Promise<string[]>;
   revokeAllSessions(accountId: string): Promise<string[]>;
}
