import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CommerceMetricsService } from '@commerce/services';

@Controller('metrics')
export class CommerceMetricsController {
   constructor(private readonly metricsService: CommerceMetricsService) {}

   @Get()
   @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
   async getMetrics(@Res() res: Response): Promise<void> {
      res.setHeader('Content-Type', this.metricsService.getContentType());
      const metrics = await this.metricsService.getMetrics();
      res.send(metrics);
   }
}
