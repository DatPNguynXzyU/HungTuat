import { Module, DynamicModule, Global } from '@nestjs/common';
import { CloudinaryService } from '@common/cloudinary/cloudinary.service';
import { CloudinaryConfig, getCloudinaryConfig } from '@common/cloudinary/cloudinary.config';
import { CommonConfigService } from '@common/config/common-config.service';

@Global()
@Module({})
export class CloudinaryModule {
   static forRoot(config?: Partial<CloudinaryConfig>): DynamicModule {
      return {
         module: CloudinaryModule,
         providers: [
            {
               provide: 'CLOUDINARY_CONFIG',
               useFactory: (configService: CommonConfigService) => {
                  const cloudConfig = getCloudinaryConfig(configService);
                  return config ? { ...cloudConfig, ...config } : cloudConfig;
               },
               inject: [CommonConfigService],
            },
            {
               provide: CloudinaryService,
               useFactory: (cloudConfig: CloudinaryConfig) => new CloudinaryService(cloudConfig),
               inject: ['CLOUDINARY_CONFIG'],
            },
         ],
         exports: [CloudinaryService],
      };
   }
}
