import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DeviceDetectorUtil } from '@common/utils/device-detector.util';
import { IDeviceInfo } from '@common/interfaces/device.interface';
import { Request } from 'express';

export const ClientContext = createParamDecorator((data: unknown, ctx: ExecutionContext): IDeviceInfo => {
   const request = ctx.switchToHttp().getRequest<Request>();

   const userAgent = request.headers['user-agent'] || request.get('user-agent') || '';
   const forwardedFor = request.headers['x-forwarded-for'];
   const ipAddress =
      (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined) ||
      (request.headers['x-real-ip'] as string | undefined) ||
      request.ip ||
      request.connection?.remoteAddress ||
      '127.0.0.1';

   const headers = {
      userAgent,
      'x-client-type': request.headers['x-client-type'] as string | undefined,
      'x-device-id': request.headers['x-device-id'] as string | undefined,
      'x-device-name': request.headers['x-device-name'] as string | undefined,
      'x-app-version': request.headers['x-app-version'] as string | undefined,
   };

   return DeviceDetectorUtil.parse(userAgent, ipAddress, headers);
});
