import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CacheHealthState, HealthStatus } from '@common/constants/health.constant';

export class RedisHealthDto {
   @ApiProperty({
      description: 'Redis connection status',
      enum: CacheHealthState,
      example: CacheHealthState.UP,
   })
   status!: CacheHealthState;

   @ApiPropertyOptional({
      description: 'Ping latency in milliseconds',
      example: 2,
   })
   latency?: number;

   @ApiPropertyOptional({
      description: 'Error message if Redis is down',
      example: 'Connection refused',
   })
   message?: string;
}

export class HealthCheckResponseDto {
   @ApiProperty({
      description: 'Health status identifier',
      enum: HealthStatus,
      example: HealthStatus.OK,
   })
   status!: HealthStatus;

   @ApiProperty({
      description: 'Process uptime in seconds',
      example: 124.5,
   })
   uptime!: number;

   @ApiProperty({
      description: 'Current UTC timestamp when health probe ran',
      example: '2026-10-11T09:41:51.000Z',
   })
   timestamp!: string;

   @ApiPropertyOptional({
      description: 'Redis cache connection health details',
      type: RedisHealthDto,
   })
   redis?: RedisHealthDto;
}
