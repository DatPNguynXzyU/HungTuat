import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_RMQ_KEY = 'permissions_rmq';

/**
 * Decorator to specify required permissions for RabbitMQ message handlers
 * Use this on @MessagePattern handlers in microservices
 * @param permissions - Array of required permissions
 * @example
 * @RequirePermissionsRmq(['audit_logs:read'])
 * @MessagePattern({ cmd: 'get_audit_logs' })
 * async getAuditLogs(@Payload() message: IServiceMessage<QueryAuditLogDto>) {
 *   checkPermissions(message, this.reflector.get(PERMISSIONS_RMQ_KEY, context.getHandler()));
 *   // ... handler logic
 * }
 */
export const RequirePermissionsRmq = (...permissions: string[]) => SetMetadata(PERMISSIONS_RMQ_KEY, permissions);
