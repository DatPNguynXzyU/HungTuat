import { Injectable } from '@nestjs/common';
import { AuditStatus, Prisma, type SecurityAuditLog } from '@auth/prisma-client';
import { uuidv7 } from '@common';
import { AuditSanitizerUtil, type IAuditLogListResult, type IAuditLogQuery } from '@common';
import type { CreateAuditLogData, SecurityAuditLogEntity } from '@auth/entities/audit-log.entity';
import { PrismaService } from '@auth/prisma/prisma.service';
import type { IAuditLogRepository } from '@auth/repositories/audit-log.repository.interface';

@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
   constructor(private readonly prisma: PrismaService) {}

   private toEntity(log: SecurityAuditLog): SecurityAuditLogEntity {
      return {
         id: log.auditLogId,
         accountId: log.accountId,
         actorEmail: log.actorEmail,
         action: log.action,
         status: log.status,
         ipAddress: log.ipAddress,
         userAgent: log.userAgent,
         deviceType: log.deviceType,
         deviceName: log.deviceName,
         browser: log.browser,
         os: log.os,
         city: log.city,
         country: log.country,
         reason: log.reason,
         metadata: log.metadata as Record<string, unknown> | null,
         createdAt: log.createdAt.toISOString(),
      };
   }

   async createAuditLog(data: CreateAuditLogData): Promise<SecurityAuditLogEntity> {
      const id = data.id || uuidv7();
      const sanitizedMeta = data.metadata
         ? (AuditSanitizerUtil.sanitize(data.metadata) as Prisma.InputJsonValue)
         : Prisma.DbNull;

      const status = data.status === 'FAILURE' ? AuditStatus.FAILURE : AuditStatus.SUCCESS;

      const log = await this.prisma.securityAuditLog.create({
         data: {
            auditLogId: id,
            accountId: data.accountId || null,
            actorEmail: data.actorEmail || null,
            action: data.action,
            status,
            ipAddress: data.ipAddress || null,
            userAgent: data.userAgent || null,
            deviceType: data.deviceType || null,
            deviceName: data.deviceName || null,
            browser: data.browser || null,
            os: data.os || null,
            city: data.city || null,
            country: data.country || null,
            reason: data.reason || null,
            metadata: sanitizedMeta,
            ...(data.createdAt ? { createdAt: new Date(data.createdAt) } : {}),
         },
      });

      return this.toEntity(log);
   }

   async findAuditLogs(query: IAuditLogQuery): Promise<IAuditLogListResult> {
      const page = Math.max(query.page || 1, 1);
      const limit = Math.max(Math.min(query.limit || 10, 100), 1);
      const skip = (page - 1) * limit;

      const where: Prisma.SecurityAuditLogWhereInput = {};

      if (query.accountId) {
         where.accountId = query.accountId;
      }

      if (query.actorEmail) {
         where.actorEmail = {
            contains: query.actorEmail,
            mode: 'insensitive',
         };
      }

      if (query.action) {
         where.action = query.action;
      }

      if (query.status) {
         where.status = query.status === 'FAILURE' ? AuditStatus.FAILURE : AuditStatus.SUCCESS;
      }

      if (query.startDate || query.endDate) {
         where.createdAt = {
            ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
            ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
         };
      }

      const [logs, total] = await Promise.all([
         this.prisma.securityAuditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
         }),
         this.prisma.securityAuditLog.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
         data: logs.map((l) => this.toEntity(l)),
         total,
         page,
         limit,
         totalPages,
      };
   }

   async findById(auditLogId: string): Promise<SecurityAuditLogEntity | null> {
      const log = await this.prisma.securityAuditLog.findUnique({
         where: { auditLogId },
      });

      return log ? this.toEntity(log) : null;
   }

   async findAccountAuditLogs(accountId: string, page = 1, limit = 10): Promise<IAuditLogListResult> {
      return this.findAuditLogs({
         accountId,
         page,
         limit,
      });
   }
}
