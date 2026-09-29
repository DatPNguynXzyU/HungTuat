import { CommonConfigService } from '@common/config/common-config.service';

export interface NebulaConfig {
   graphAddress: string;
   graphPort: number;
   username: string;
   password: string;
   space: string;
}

export const getNebulaConfig = (configService: CommonConfigService): NebulaConfig => {
   const nebulaConfig = configService.nebula;
   return {
      graphAddress: nebulaConfig.graphAddress,
      graphPort: nebulaConfig.graphPort,
      username: nebulaConfig.username,
      password: nebulaConfig.password,
      space: nebulaConfig.space,
   };
};
