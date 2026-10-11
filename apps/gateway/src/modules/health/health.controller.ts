import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HEALTH_RESPONSE_MESSAGES, HealthCheckResponseDto, Public, ResponseMessage } from '@common';

@ApiTags('Health')
@Controller()
export class HealthController {
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
         status: 'ok',
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
   check(): HealthCheckResponseDto {
      return {
         status: 'ok',
         uptime: process.uptime(),
         timestamp: new Date().toISOString(),
      };
   }
}
