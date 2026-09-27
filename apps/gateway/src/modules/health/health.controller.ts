import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public, ResponseMessage } from '@common';

@ApiTags('Health')
@Controller('health')
export class HealthController {
   @Public()
   @Get()
   @ApiOperation({ summary: 'Gateway Health Check' })
   @ApiResponse({ status: 200, description: 'Gateway service is healthy' })
   @ResponseMessage('HEALTH_CHECK_SUCCESS')
   check() {
      return {
         status: 'ok',
         uptime: process.uptime(),
         timestamp: new Date().toISOString(),
      };
   }
}
