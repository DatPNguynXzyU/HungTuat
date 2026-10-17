import { z } from 'zod';

export const nebulaEnvSchema = z.object({
   NEBULA_GRAPHD_HOST: z.string().default('127.0.0.1'),
   NEBULA_GRAPHD_PORT: z.coerce.number().int().positive().default(9669),
   NEBULA_USERNAME: z.string().default('root'),
   NEBULA_PASSWORD: z.string().default('nebula'),
   NEBULA_SPACE: z.string().default('social_graph'),
});

export type NebulaEnvConfig = z.infer<typeof nebulaEnvSchema>;

export interface NebulaConfig {
   graphAddress: string;
   graphPort: number;
   username: string;
   password: string;
   space: string;
}

export interface NebulaConfigProvider {
   nebula?: Partial<NebulaConfig>;
}

export const validateNebulaConfig = (rawEnv: Record<string, unknown> = process.env): NebulaConfig => {
   const parsed = nebulaEnvSchema.parse(rawEnv);
   return {
      graphAddress: parsed.NEBULA_GRAPHD_HOST,
      graphPort: parsed.NEBULA_GRAPHD_PORT,
      username: parsed.NEBULA_USERNAME,
      password: parsed.NEBULA_PASSWORD,
      space: parsed.NEBULA_SPACE,
   };
};

export const getNebulaConfig = (configService?: NebulaConfigProvider): NebulaConfig => {
   const defaultNebula = validateNebulaConfig();
   const nebulaConfig = configService?.nebula;
   if (!nebulaConfig) {
      return defaultNebula;
   }
   return {
      graphAddress: nebulaConfig.graphAddress || defaultNebula.graphAddress,
      graphPort: Number(nebulaConfig.graphPort || defaultNebula.graphPort),
      username: nebulaConfig.username || defaultNebula.username,
      password: nebulaConfig.password || defaultNebula.password,
      space: nebulaConfig.space || defaultNebula.space,
   };
};
