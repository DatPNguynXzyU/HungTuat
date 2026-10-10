import { CommonConfigService } from '@common/config/common-config.service';

export interface NebulaConfig {
   graphAddress: string;
   graphPort: number;
   username: string;
   password: string;
   space: string;
}

export const getNebulaConfig = (configService?: CommonConfigService): NebulaConfig => {
   const nebulaConfig = configService?.nebula;
   return {
      graphAddress: nebulaConfig?.graphAddress || process.env.NEBULA_GRAPHD_HOST || '127.0.0.1',
      graphPort: Number(nebulaConfig?.graphPort || process.env.NEBULA_GRAPHD_PORT || 9669),
      username: nebulaConfig?.username || process.env.NEBULA_USERNAME || 'root',
      password: nebulaConfig?.password || process.env.NEBULA_PASSWORD || 'nebula',
      space: nebulaConfig?.space || process.env.NEBULA_SPACE || 'omni_users',
   };
};
