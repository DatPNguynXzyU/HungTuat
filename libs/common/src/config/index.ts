export * from '@common/config/shared-env.schema';
export * from '@common/config/tracing-env.schema';
export * from '@common/config/common-config.service';
export * from '@common/config/common-config.module';

export { CommonConfigService as AppConfigService } from '@common/config/common-config.service';
export { CommonConfigModule as AppConfigModule } from '@common/config/common-config.module';
export { sharedEnvSchema as envSchema, validateSharedEnv as validateEnv } from '@common/config/shared-env.schema';
export type { SharedEnvConfig as EnvConfig } from '@common/config/shared-env.schema';
