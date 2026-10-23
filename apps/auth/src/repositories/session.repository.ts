import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from '@common';
import type { SessionEntity, CreateSessionData } from '@auth/entities/session.entity';
import { PrismaService, type PrismaClientOrTransaction } from '@auth/prisma';
import type { ISessionRepository } from '@auth/repositories/session.repository.interface';
import type { AccountSession } from '@auth/prisma-client';

@Injectable()
export class SessionRepository implements ISessionRepository {
   constructor(@Inject(PrismaService) private readonly prisma: PrismaClientOrTransaction) {}

   private toEntity(session: AccountSession): SessionEntity {
      return {
         id: session.sessionId,
         accountId: session.accountId,
         refreshTokenJti: session.refreshTokenJti,
         refreshTokenHash: session.refreshTokenHash,
         deviceType: session.deviceType,
         deviceName: session.deviceName,
         browser: session.browser,
         os: session.os,
         userAgent: session.userAgent,
         ipAddress: session.ipAddress,
         city: session.city,
         region: session.region,
         country: session.country,
         countryCode: session.countryCode,
         deviceId: session.deviceId,
         clientType: session.clientType,
         appVersion: session.appVersion,
         isRevoked: session.isRevoked,
         lastActiveAt: session.lastActiveAt.toISOString(),
         expiresAt: session.expiresAt.toISOString(),
         createdAt: session.createdAt.toISOString(),
         updatedAt: session.updatedAt.toISOString(),
      };
   }

   async createSession(data: CreateSessionData): Promise<SessionEntity> {
      const id = data.id || uuidv7();
      const session = await this.prisma.accountSession.create({
         data: {
            sessionId: id,
            accountId: data.accountId,
            refreshTokenJti: data.refreshTokenJti,
            refreshTokenHash: data.refreshTokenHash,
            deviceType: data.deviceType,
            deviceName: data.deviceName,
            browser: data.browser,
            os: data.os,
            userAgent: data.userAgent,
            ipAddress: data.ipAddress,
            city: data.city,
            region: data.region,
            country: data.country,
            countryCode: data.countryCode,
            deviceId: data.deviceId,
            clientType: data.clientType,
            appVersion: data.appVersion,
            isRevoked: data.isRevoked ?? false,
            expiresAt: new Date(data.expiresAt),
            ...(data.lastActiveAt ? { lastActiveAt: new Date(data.lastActiveAt) } : {}),
            ...(data.createdAt ? { createdAt: new Date(data.createdAt) } : {}),
         },
      });

      return this.toEntity(session);
   }

   async findById(sessionId: string): Promise<SessionEntity | null> {
      const session = await this.prisma.accountSession.findUnique({
         where: { sessionId },
      });
      return session ? this.toEntity(session) : null;
   }

   async findByJti(refreshTokenJti: string): Promise<SessionEntity | null> {
      const session = await this.prisma.accountSession.findUnique({
         where: { refreshTokenJti },
      });
      return session ? this.toEntity(session) : null;
   }

   async findActiveSessionsByAccountId(accountId: string): Promise<SessionEntity[]> {
      const sessions = await this.prisma.accountSession.findMany({
         where: {
            accountId,
            isRevoked: false,
            expiresAt: {
               gt: new Date(),
            },
         },
         orderBy: {
            lastActiveAt: 'desc',
         },
      });

      return sessions.map((s) => this.toEntity(s));
   }

   async updateSession(sessionId: string, data: Partial<SessionEntity>): Promise<SessionEntity | null> {
      try {
         const session = await this.prisma.accountSession.update({
            where: { sessionId },
            data: {
               ...(data.refreshTokenJti ? { refreshTokenJti: data.refreshTokenJti } : {}),
               ...(data.refreshTokenHash !== undefined ? { refreshTokenHash: data.refreshTokenHash } : {}),
               ...(data.deviceType !== undefined ? { deviceType: data.deviceType } : {}),
               ...(data.deviceName !== undefined ? { deviceName: data.deviceName } : {}),
               ...(data.browser !== undefined ? { browser: data.browser } : {}),
               ...(data.os !== undefined ? { os: data.os } : {}),
               ...(data.userAgent !== undefined ? { userAgent: data.userAgent } : {}),
               ...(data.ipAddress !== undefined ? { ipAddress: data.ipAddress } : {}),
               ...(data.city !== undefined ? { city: data.city } : {}),
               ...(data.region !== undefined ? { region: data.region } : {}),
               ...(data.country !== undefined ? { country: data.country } : {}),
               ...(data.countryCode !== undefined ? { countryCode: data.countryCode } : {}),
               ...(data.deviceId !== undefined ? { deviceId: data.deviceId } : {}),
               ...(data.clientType !== undefined ? { clientType: data.clientType } : {}),
               ...(data.appVersion !== undefined ? { appVersion: data.appVersion } : {}),
               ...(typeof data.isRevoked === 'boolean' ? { isRevoked: data.isRevoked } : {}),
               ...(data.lastActiveAt ? { lastActiveAt: new Date(data.lastActiveAt) } : {}),
               ...(data.expiresAt ? { expiresAt: new Date(data.expiresAt) } : {}),
            },
         });

         return this.toEntity(session);
      } catch {
         return null;
      }
   }

   async updateSessionByJti(refreshTokenJti: string, data: Partial<SessionEntity>): Promise<SessionEntity | null> {
      try {
         const session = await this.prisma.accountSession.update({
            where: { refreshTokenJti },
            data: {
               ...(data.refreshTokenJti ? { refreshTokenJti: data.refreshTokenJti } : {}),
               ...(data.refreshTokenHash !== undefined ? { refreshTokenHash: data.refreshTokenHash } : {}),
               ...(data.deviceType !== undefined ? { deviceType: data.deviceType } : {}),
               ...(data.deviceName !== undefined ? { deviceName: data.deviceName } : {}),
               ...(data.browser !== undefined ? { browser: data.browser } : {}),
               ...(data.os !== undefined ? { os: data.os } : {}),
               ...(data.userAgent !== undefined ? { userAgent: data.userAgent } : {}),
               ...(data.ipAddress !== undefined ? { ipAddress: data.ipAddress } : {}),
               ...(data.city !== undefined ? { city: data.city } : {}),
               ...(data.region !== undefined ? { region: data.region } : {}),
               ...(data.country !== undefined ? { country: data.country } : {}),
               ...(data.countryCode !== undefined ? { countryCode: data.countryCode } : {}),
               ...(data.deviceId !== undefined ? { deviceId: data.deviceId } : {}),
               ...(data.clientType !== undefined ? { clientType: data.clientType } : {}),
               ...(data.appVersion !== undefined ? { appVersion: data.appVersion } : {}),
               ...(typeof data.isRevoked === 'boolean' ? { isRevoked: data.isRevoked } : {}),
               ...(data.lastActiveAt ? { lastActiveAt: new Date(data.lastActiveAt) } : {}),
               ...(data.expiresAt ? { expiresAt: new Date(data.expiresAt) } : {}),
            },
         });

         return this.toEntity(session);
      } catch {
         return null;
      }
   }

   async revokeSession(sessionId: string, accountId: string): Promise<SessionEntity | null> {
      try {
         const existing = await this.prisma.accountSession.findFirst({
            where: { sessionId, accountId },
         });
         if (!existing) return null;

         const updated = await this.prisma.accountSession.update({
            where: { sessionId },
            data: {
               isRevoked: true,
            },
         });

         return this.toEntity(updated);
      } catch {
         return null;
      }
   }

   async revokeSessionsByDeviceId(accountId: string, deviceId: string): Promise<string[]> {
      const result: unknown = await this.prisma.accountSession.findMany({
         where: {
            accountId,
            deviceId,
            isRevoked: false,
         },
         select: {
            refreshTokenJti: true,
         },
      });

      const sessions = Array.isArray(result) ? (result as Array<{ refreshTokenJti: string }>) : [];
      const jtis: string[] = sessions.map((s) => String(s.refreshTokenJti));

      if (jtis.length > 0) {
         await this.prisma.accountSession.updateMany({
            where: {
               accountId,
               deviceId,
               isRevoked: false,
            },
            data: {
               isRevoked: true,
            },
         });
      }

      return jtis;
   }

   async revokeOtherSessions(accountId: string, currentJti: string): Promise<string[]> {
      const result: unknown = await this.prisma.accountSession.findMany({
         where: {
            accountId,
            refreshTokenJti: { not: currentJti },
            isRevoked: false,
         },
         select: {
            refreshTokenJti: true,
         },
      });

      const otherSessions = Array.isArray(result) ? (result as Array<{ refreshTokenJti: string }>) : [];
      const jtis: string[] = otherSessions.map((s) => String(s.refreshTokenJti));

      if (jtis.length > 0) {
         await this.prisma.accountSession.updateMany({
            where: {
               accountId,
               refreshTokenJti: { not: currentJti },
               isRevoked: false,
            },
            data: {
               isRevoked: true,
            },
         });
      }

      return jtis;
   }

   async revokeAllSessions(accountId: string): Promise<string[]> {
      const result: unknown = await this.prisma.accountSession.findMany({
         where: {
            accountId,
            isRevoked: false,
         },
         select: {
            refreshTokenJti: true,
         },
      });

      const sessions = Array.isArray(result) ? (result as Array<{ refreshTokenJti: string }>) : [];
      const jtis: string[] = sessions.map((s) => String(s.refreshTokenJti));

      if (jtis.length > 0) {
         await this.prisma.accountSession.updateMany({
            where: {
               accountId,
               isRevoked: false,
            },
            data: {
               isRevoked: true,
            },
         });
      }

      return jtis;
   }
}
