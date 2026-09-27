import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonConfigService } from '@common';
import { NotificationEnvConfig } from '@notification/config/notification-env.schema';

@Injectable()
export class NotificationConfigService extends CommonConfigService {
   constructor(protected override readonly configService: ConfigService<NotificationEnvConfig, true>) {
      super(configService);
   }

   get resendToken(): string {
      return (
         this.configService.get('RESEND_TOKEN', { infer: true }) ||
         this.configService.get('RESEND_API_KEY', { infer: true }) ||
         ''
      );
   }

   get emailFrom(): string {
      return this.configService.get('EMAIL_FROM', { infer: true });
   }

   get emailFromName(): string {
      return this.configService.get('EMAIL_FROM_NAME', { infer: true });
   }

   get defaultSender(): string {
      const name = this.emailFromName;
      const from = this.emailFrom;
      return name ? `${name} <${from}>` : from;
   }
}
