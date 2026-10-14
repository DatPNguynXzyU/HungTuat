import { Controller, Get, HttpStatus, Inject, Logger, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AUTH_METRICS_SERVICE, type IAuthMetricsService } from '@auth/services/infrastructure';

@Controller('metrics')
@ApiTags('Observability')
export class AuthMetricsController {
   private readonly logger = new Logger(AuthMetricsController.name);

   constructor(
      @Inject(AUTH_METRICS_SERVICE)
      private readonly metricsService: IAuthMetricsService,
   ) {}

   @Get()
   @ApiOperation({
      summary: 'Get Prometheus metrics',
      description: 'Returns authentication service metrics in Prometheus text-based exposition format for scraping',
      operationId: 'getPrometheusMetrics',
   })
   @ApiResponse({
      status: 200,
      description: 'Metrics successfully retrieved in Prometheus format',
      content: {
         'text/plain; version=0.0.4; charset=utf-8': {
            schema: { type: 'string' },
            example:
               '# HELP auth_login_attempts_total Total number of login attempts\nauth_login_attempts_total{status="success",reason="none"} 42\n',
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
