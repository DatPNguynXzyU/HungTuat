import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
   protected override getTracker(req: Record<string, unknown>): Promise<string> {
      const rawReq = req as unknown as Request;
      const forwarded = rawReq.headers?.['x-forwarded-for'];
      if (typeof forwarded === 'string') {
         return Promise.resolve(forwarded.split(',')[0].trim());
      }
      const realIp = rawReq.headers?.['x-real-ip'];
      if (typeof realIp === 'string') {
         return Promise.resolve(realIp);
      }
      return Promise.resolve(rawReq.ip || rawReq.socket?.remoteAddress || 'unknown-ip');
   }
}
