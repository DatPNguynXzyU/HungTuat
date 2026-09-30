import { SetMetadata } from '@nestjs/common';

export const ROLES_RMQ_KEY = 'roles_rmq';

/**
 * Decorator to specify required roles for RabbitMQ message handlers
 * Use this on @MessagePattern handlers in microservices
 * @param roles - Array of required roles
 * @example
 * @RequireRolesRmq(['admin'])
 * @MessagePattern({ cmd: 'get_audit_logs' })
 * async getAuditLogs(@Payload() message: IServiceMessage<QueryAuditLogDto>) {
 *   checkRoles(message, this.reflector.get(ROLES_RMQ_KEY, context.getHandler()));
 *   // ... handler logic
 * }
 */
export const RequireRolesRmq = (...roles: string[]) => SetMetadata(ROLES_RMQ_KEY, roles);
