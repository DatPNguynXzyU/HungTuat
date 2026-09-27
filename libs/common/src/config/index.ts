export * from './shared-env.schema';
export * from './common-config.service';
export * from './common-config.module';

// Backward-compatible aliases for common usage
export { CommonConfigService as AppConfigService } from './common-config.service';
export { CommonConfigModule as AppConfigModule } from './common-config.module';
export { sharedEnvSchema as envSchema, validateSharedEnv as validateEnv } from './shared-env.schema';
export type { SharedEnvConfig as EnvConfig } from './shared-env.schema';
