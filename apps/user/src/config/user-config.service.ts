import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserConfigService {
   constructor(private configService: ConfigService) {}

   get serviceName(): string {
      return this.configService.get<string>('SERVICE_NAME', 'user-service');
   }

   get database() {
      return {
         url: this.configService.get<string>('DATABASE_URL'),
      };
   }
}
