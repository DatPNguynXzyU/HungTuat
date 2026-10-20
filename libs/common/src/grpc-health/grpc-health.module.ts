import { DynamicModule, Module, type FactoryProvider, type ModuleMetadata, type Provider } from '@nestjs/common';
import { GrpcHealthController } from '@common/grpc-health/grpc-health.controller';
import { GrpcHealthService } from '@common/grpc-health/grpc-health.service';
import {
   GRPC_HEALTH_INDICATORS,
   type IHealthIndicator,
} from '@common/grpc-health/interfaces/health-indicator.interface';

export interface GrpcHealthModuleOptions {
   indicators?: IHealthIndicator[];
}

export interface GrpcHealthModuleAsyncOptions {
   imports?: ModuleMetadata['imports'];
   useFactory: FactoryProvider<Promise<IHealthIndicator[]> | IHealthIndicator[]>['useFactory'];
   inject?: FactoryProvider['inject'];
}

@Module({
   controllers: [GrpcHealthController],
   providers: [
      GrpcHealthService,
      {
         provide: GRPC_HEALTH_INDICATORS,
         useValue: [],
      },
   ],
   exports: [GrpcHealthService, GRPC_HEALTH_INDICATORS],
})
export class GrpcHealthModule {
   static register(options?: GrpcHealthModuleOptions): DynamicModule {
      const providers: Provider[] = [
         GrpcHealthService,
         {
            provide: GRPC_HEALTH_INDICATORS,
            useValue: options?.indicators || [],
         },
      ];

      return {
         module: GrpcHealthModule,
         controllers: [GrpcHealthController],
         providers,
         exports: [GrpcHealthService, GRPC_HEALTH_INDICATORS],
      };
   }

   static registerAsync(options: GrpcHealthModuleAsyncOptions): DynamicModule {
      const providers: Provider[] = [
         GrpcHealthService,
         {
            provide: GRPC_HEALTH_INDICATORS,
            useFactory: options.useFactory,
            inject: options.inject || [],
         },
      ];

      return {
         module: GrpcHealthModule,
         imports: options.imports || [],
         controllers: [GrpcHealthController],
         providers,
         exports: [GrpcHealthService, GRPC_HEALTH_INDICATORS],
      };
   }
}
