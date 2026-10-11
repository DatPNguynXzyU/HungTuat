import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HEALTH_RESPONSE_MESSAGES, Public, ResponseMessage } from '@common';

@ApiTags('Health')
@Controller()
export class HealthController {
   @Public()
   @Get()
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'Gateway Root Health Check' })
   @ApiResponse({ status: 200, description: 'Gateway service is healthy and operational' })
   @ResponseMessage(HEALTH_RESPONSE_MESSAGES.HEALTH_CHECK_SUCCESS)
   root() {
      return {
         status: 'ok',
         uptime: process.uptime(),
         timestamp: new Date().toISOString(),
      };
   }

   @Public()
   @Get(['health', 'api/v1/health'])
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'Gateway Health Check' })
   @ApiResponse({ status: 200, description: 'Gateway service is healthy' })
   @ResponseMessage(HEALTH_RESPONSE_MESSAGES.HEALTH_CHECK_SUCCESS)
   check() {
      return {
         status: 'ok',
         uptime: process.uptime(),
         timestamp: new Date().toISOString(),
      };
   }
}
