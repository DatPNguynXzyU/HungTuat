import { Controller, Get, HttpStatus, Inject, Logger, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { USER_METRICS_SERVICE, type IUserMetricsService } from '@user/services/infrastructure';

@Controller('metrics')
@ApiTags('Observability')
export class UserMetricsController {
   private readonly logger = new Logger(UserMetricsController.name);

   constructor(
      @Inject(USER_METRICS_SERVICE)
      private readonly metricsService: IUserMetricsService,
   ) {}

   @Get()
   @ApiOperation({
      summary: 'Get Prometheus metrics',
      description: 'Returns user service metrics in Prometheus text-based exposition format for scraping',
      operationId: 'getUserPrometheusMetrics',
   })
   @ApiResponse({
      status: 200,
      description: 'Metrics successfully retrieved in Prometheus format',
      content: {
         'text/plain; version=0.0.4; charset=utf-8': {
            schema: { type: 'string' },
            example:
               '# HELP user_media_operations_total Total number of media adapter operations\nuser_media_operations_total{operation="upload_avatar",status="success"} 12\n',
         },
      },
   })
   @ApiResponse({
      status: 500,
      description: 'Failed to collect metrics',
   })
   async getMetrics(@Res() res: Response): Promise<void> {
      try {
         res.setHeader('Content-Type', this.metricsService.contentType);
         const metrics = await this.metricsService.getMetrics();
         res.send(metrics);
      } catch (error) {
         this.logger.error('Failed to collect Prometheus metrics', error);
         res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('# Error collecting metrics\n');
      }
   }
}
