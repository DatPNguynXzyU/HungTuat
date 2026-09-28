import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import type { CreateSessionData, UserSessionEntity } from '@auth/entities/session.entity';
import { PrismaService } from '@auth/prisma/prisma.service';
import type { ISessionRepository } from '@auth/repositories/session.repository.interface';
import type { UserSession } from '@prisma/client';

@Injectable()
export class SessionRepository implements ISessionRepository {
   constructor(private readonly prisma: PrismaService) {}

   private toEntity(session: UserSession): UserSessionEntity {
      return {
         id: session.id,
         userId: session.userId,
         refreshTokenJti: session.refreshTokenJti,
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
         isRevoked: session.isRevoked,
         lastActiveAt: session.lastActiveAt.toISOString(),
         expiresAt: session.expiresAt.toISOString(),
         createdAt: session.createdAt.toISOString(),
         updatedAt: session.updatedAt.toISOString(),
      };
   }

   async createSession(data: CreateSessionData): Promise<UserSessionEntity> {
      const id = data.id || uuidv7();
      const session = await this.prisma.userSession.create({
         data: {
            id,
            userId: data.userId,
            refreshTokenJti: data.refreshTokenJti,
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
            isRevoked: data.isRevoked ?? false,
            expiresAt: new Date(data.expiresAt),
            ...(data.lastActiveAt ? { lastActiveAt: new Date(data.lastActiveAt) } : {}),
            ...(data.createdAt ? { createdAt: new Date(data.createdAt) } : {}),
         },
      });

      return this.toEntity(session);
   }

   async findById(id: string): Promise<UserSessionEntity | null> {
      const session = await this.prisma.userSession.findUnique({
         where: { id },
      });
      return session ? this.toEntity(session) : null;
   }

   async findByJti(refreshTokenJti: string): Promise<UserSessionEntity | null> {
      const session = await this.prisma.userSession.findUnique({
         where: { refreshTokenJti },
      });
      return session ? this.toEntity(session) : null;
   }

   async findActiveSessionsByUserId(userId: string): Promise<UserSessionEntity[]> {
      const sessions = await this.prisma.userSession.findMany({
         where: {
            userId,
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

   async updateSession(id: string, data: Partial<UserSessionEntity>): Promise<UserSessionEntity | null> {
      try {
         const session = await this.prisma.userSession.update({
            where: { id },
            data: {
               ...(data.refreshTokenJti ? { refreshTokenJti: data.refreshTokenJti } : {}),
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

   async updateSessionByJti(
      refreshTokenJti: string,
      data: Partial<UserSessionEntity>,
   ): Promise<UserSessionEntity | null> {
      try {
         const session = await this.prisma.userSession.update({
            where: { refreshTokenJti },
            data: {
               ...(data.refreshTokenJti ? { refreshTokenJti: data.refreshTokenJti } : {}),
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

   async revokeSession(id: string, userId: string): Promise<UserSessionEntity | null> {
      try {
         const existing = await this.prisma.userSession.findFirst({
            where: { id, userId },
         });
         if (!existing) return null;

         const updated = await this.prisma.userSession.update({
            where: { id },
            data: {
               isRevoked: true,
            },
         });

         return this.toEntity(updated);
      } catch {
         return null;
      }
   }

   async revokeOtherSessions(userId: string, currentJti: string): Promise<string[]> {
      const result: unknown = await this.prisma.userSession.findMany({
         where: {
            userId,
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
         await this.prisma.userSession.updateMany({
            where: {
               userId,
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

   async revokeAllSessions(userId: string): Promise<string[]> {
      const result: unknown = await this.prisma.userSession.findMany({
         where: {
            userId,
            isRevoked: false,
         },
         select: {
            refreshTokenJti: true,
         },
      });

      const sessions = Array.isArray(result) ? (result as Array<{ refreshTokenJti: string }>) : [];
      const jtis: string[] = sessions.map((s) => String(s.refreshTokenJti));

      if (jtis.length > 0) {
         await this.prisma.userSession.updateMany({
            where: {
               userId,
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
