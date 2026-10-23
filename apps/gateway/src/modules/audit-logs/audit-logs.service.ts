import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import {
   CircuitBreakerRegistry,
   createGrpcMetadata,
   handleGrpcError,
   RetryPolicyRegistry,
   SERVICE_NAMES,
   withGrpcRetry,
   type JwtPayload,
} from '@common';
import {
   AUTH_V1_GRPC_CLIENT,
   AUTH_V1_GRPC_SERVICE_NAME,
   type IAuditLogListResult,
   type IAuthV1GrpcService,
   type ISecurityAuditLog,
   type QueryAuditLogDto,
} from '@contracts/auth';
import { defer, firstValueFrom } from 'rxjs';

@Injectable()
export class AuditLogsService implements OnModuleInit {
   private authGrpcService!: IAuthV1GrpcService;
   private readonly auditLogsGrpcBreaker = CircuitBreakerRegistry.getOrCreate(AUTH_V1_GRPC_SERVICE_NAME, {
      timeout: 5000,
      failureThreshold: 5,
      resetTimeout: 10000,
   });
   private readonly auditLogsGrpcRetryPolicy = RetryPolicyRegistry.getOrCreate(AUTH_V1_GRPC_SERVICE_NAME, {
      maxAttempts: 3,
      initialDelayMs: 100,
      multiplier: 2,
      maxDelayMs: 2000,
   });

   constructor(@Inject(AUTH_V1_GRPC_CLIENT) private readonly authGrpcClient: ClientGrpc) {}

   onModuleInit(): void {
      this.authGrpcService = this.authGrpcClient.getService<IAuthV1GrpcService>(AUTH_V1_GRPC_SERVICE_NAME);
   }

   async getAuditLogs(
      query: QueryAuditLogDto,
      user?: JwtPayload,
      correlationId?: string,
   ): Promise<IAuditLogListResult> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
            userId: user?.sub,
            email: user?.email,
            roles: user?.roles || [],
            permissions: user?.permissions || [],
         });

         const response = await this.auditLogsGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.getAuditLogs(
                     {
                        page: query.page,
                        limit: query.limit,
                        accountId: query.accountId,
                        actorEmail: query.actorEmail,
                        action: query.action,
                        status: query.status,
                        startDate: query.startDate,
                        endDate: query.endDate,
                        requestingUserId: user?.sub,
                        requestingRoles: user?.roles || [],
                        requestingPermissions: (user?.permissions as string[]) || [],
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.auditLogsGrpcRetryPolicy)),
            );
         });

         return {
            data: (response.items || []).map((item): ISecurityAuditLog => ({
               auditLogId: item.auditLogId,
               accountId: item.userId || item.accountId || null,
               actorEmail: item.actorEmail || null,
               action: item.action,
               status: item.status,
               ipAddress: item.ipAddress || null,
               userAgent: item.userAgent || null,
               deviceType: item.deviceType || null,
               deviceName: item.deviceName || null,
               browser: item.browser || null,
               os: item.os || null,
               city: item.city || null,
               country: item.country || null,
               reason: item.reason || null,
               metadata: item.metadataJson ? (JSON.parse(item.metadataJson) as Record<string, unknown>) : null,
               createdAt: item.createdAt,
            })),
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages,
         };
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async getAuditLogById(
      auditLogId: string,
      user?: JwtPayload,
      correlationId?: string,
   ): Promise<ISecurityAuditLog | null> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
            userId: user?.sub,
            email: user?.email,
            roles: user?.roles || [],
         });

         const response = await this.auditLogsGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.getAuditLogById(
                     {
                        auditLogId,
                        requestingUserId: user?.sub,
                        requestingRoles: user?.roles || [],
                        requestingPermissions: (user?.permissions as string[]) || [],
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.auditLogsGrpcRetryPolicy)),
            );
         });

         if (!response?.auditLog || !response.auditLog.auditLogId) {
            return null;
         }

         const item = response.auditLog;
         return {
            auditLogId: item.auditLogId,
            accountId: item.userId || item.accountId || null,
            actorEmail: item.actorEmail || null,
            action: item.action,
            status: item.status,
            ipAddress: item.ipAddress || null,
            userAgent: item.userAgent || null,
            deviceType: item.deviceType || null,
            deviceName: item.deviceName || null,
            browser: item.browser || null,
            os: item.os || null,
            city: item.city || null,
            country: item.country || null,
            reason: item.reason || null,
            metadata: item.metadataJson ? (JSON.parse(item.metadataJson) as Record<string, unknown>) : null,
            createdAt: item.createdAt,
         };
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }
}
