import { Controller, Get, HttpCode, HttpStatus, Optional } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
   CacheHealthState,
   CacheService,
   HEALTH_RESPONSE_MESSAGES,
   HealthCheckResponseDto,
   HealthStatus,
   Public,
   RedisHealthDto,
   ResponseMessage,
} from '@common';

@ApiTags('Health')
@Controller()
export class HealthController {
   constructor(@Optional() private readonly cacheService?: CacheService) {}

   @Public()
   @Get()
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      operationId: 'healthCheckRoot',
      summary: 'Gateway Root Health Check',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Gateway service is healthy and operational',
      type: HealthCheckResponseDto,
   })
   @ResponseMessage(HEALTH_RESPONSE_MESSAGES.HEALTH_CHECK_SUCCESS)
   root(): HealthCheckResponseDto {
      return {
         status: HealthStatus.OK,
         uptime: process.uptime(),
         timestamp: new Date().toISOString(),
      };
   }

   @Public()
   @Get(['health', 'api/v1/health'])
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      operationId: 'healthCheck',
      summary: 'Gateway Health Check',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Gateway service is healthy',
      type: HealthCheckResponseDto,
   })
   @ResponseMessage(HEALTH_RESPONSE_MESSAGES.HEALTH_CHECK_SUCCESS)
   async check(): Promise<HealthCheckResponseDto> {
      const redisHealth = this.cacheService ? await this.cacheService.healthCheck() : undefined;
      return {
         status: HealthStatus.OK,
         uptime: process.uptime(),
         timestamp: new Date().toISOString(),
         ...(redisHealth && { redis: redisHealth }),
      };
   }

   @Public()
   @Get(['health/redis', 'api/v1/health/redis'])
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      operationId: 'healthCheckRedis',
      summary: 'Redis Cache Health Check',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Redis cache connection status and latency',
      type: RedisHealthDto,
   })
   @ResponseMessage(HEALTH_RESPONSE_MESSAGES.HEALTH_CHECK_SUCCESS)
   async checkRedis(): Promise<RedisHealthDto> {
      if (!this.cacheService) {
         return {
            status: CacheHealthState.DOWN,
            message: 'CacheService is not available',
         };
      }
      return this.cacheService.healthCheck();
   }
}
