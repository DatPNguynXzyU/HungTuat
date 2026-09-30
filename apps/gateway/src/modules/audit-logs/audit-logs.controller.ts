import { Controller, Get, HttpCode, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
   AuditLogResponseDto,
   CurrentUser,
   DEFAULT_ROLES,
   IAuditLogListResult,
   ISecurityAuditLog,
   PERMISSIONS,
   QueryAuditLogDto,
   RequirePermissions,
   RequireRoles,
   ResponseMessage,
} from '@common';
import { AuditLogsService } from '@/modules/audit-logs/audit-logs.service';
import type { JwtPayload } from '@common/utils/jwt.util';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@ApiCookieAuth()
@RequireRoles(DEFAULT_ROLES.ADMIN)
@RequirePermissions(PERMISSIONS.AUDIT_LOGS_READ)
export class AuditLogsController {
   constructor(private readonly auditLogsService: AuditLogsService) {}

   @Get()
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      summary: 'Query system security audit logs with filters (SOC 2, ISO 27001 compliance - Admin only)',
   })
   @ApiResponse({
      status: 200,
      description: 'Audit logs matching query returned successfully.',
      type: [AuditLogResponseDto],
   })
   @ResponseMessage('AUDIT_LOGS.GET_LIST_SUCCESS')
   async getAuditLogs(@Query() query: QueryAuditLogDto, @CurrentUser() user: JwtPayload): Promise<IAuditLogListResult> {
      return this.auditLogsService.getAuditLogs(query, user);
   }

   @Get(':id')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'Get security audit log entry details by ID' })
   @ApiParam({ name: 'id', description: 'Audit log UUID', type: String })
   @ApiResponse({
      status: 200,
      description: 'Audit log details returned.',
      type: AuditLogResponseDto,
   })
   @ResponseMessage('AUDIT_LOGS.GET_DETAIL_SUCCESS')
   async getAuditLogById(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<ISecurityAuditLog | null> {
      return this.auditLogsService.getAuditLogById(id, user);
   }
}
