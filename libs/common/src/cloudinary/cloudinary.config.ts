import { CommonConfigService } from '@common/config/common-config.service';

export interface CloudinaryConfig {
   cloudName: string;
   apiKey: string;
   apiSecret: string;
}

export const getCloudinaryConfig = (configService: CommonConfigService): CloudinaryConfig => {
   return configService.cloudinary;
};
