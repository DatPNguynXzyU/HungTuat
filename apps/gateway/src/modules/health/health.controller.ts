import { Controller, Get, HttpCode, HttpStatus, Optional } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
   CacheHealthState,
   CacheService,
   GrpcHealthResponseDto,
   HEALTH_RESPONSE_MESSAGES,
   HealthCheckResponseDto,
   HealthStatus,
   Public,
   RedisHealthDto,
   ResponseMessage,
} from '@common';
import { ServingStatus } from '@contracts/health';
import { AuthService } from '@/modules/auth/auth.service';
import { UsersService } from '@/modules/users/users.service';

@ApiTags('Health')
@Controller()
export class HealthController {
   constructor(
      @Optional() private readonly cacheService?: CacheService,
      @Optional() private readonly authService?: AuthService,
      @Optional() private readonly usersService?: UsersService,
   ) {}

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

   @Public()
   @Get(['health/grpc', 'api/v1/health/grpc'])
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      operationId: 'healthCheckGrpc',
      summary: 'gRPC Microservices Health Check',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Downstream gRPC microservices health status',
      type: GrpcHealthResponseDto,
   })
   @ResponseMessage(HEALTH_RESPONSE_MESSAGES.HEALTH_CHECK_SUCCESS)
   async checkGrpc(): Promise<GrpcHealthResponseDto> {
      const [authResult, userResult] = await Promise.allSettled([
         this.authService ? this.authService.checkGrpcHealth() : Promise.resolve({ status: ServingStatus.UNKNOWN }),
         this.usersService ? this.usersService.checkGrpcHealth() : Promise.resolve({ status: ServingStatus.UNKNOWN }),
      ]);

      const authStatus = authResult.status === 'fulfilled' ? authResult.value.status : ServingStatus.NOT_SERVING;
      const userStatus = userResult.status === 'fulfilled' ? userResult.value.status : ServingStatus.NOT_SERVING;

      return {
         auth: { status: authStatus },
         user: { status: userStatus },
      };
   }
}
