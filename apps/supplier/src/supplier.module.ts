import { Module, type OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
   COMMAND_BUS,
   CommandBus,
   GRPC_METRICS_COLLECTOR,
   GrpcHealthModule,
   GrpcJwtAuthGuard,
   GrpcLoggingInterceptor,
   GrpcMetricsInterceptor,
   RedisModule,
   RmqModule,
   type ICommandHandler,
} from '@common';
import { SupplierConfigModule } from '@supplier/config';
import { SupplierLoggerModule } from '@supplier/logger';
import { PrismaModule } from '@supplier/prisma';
import { UnitOfWorkModule } from '@supplier/unit-of-work';
import { SUPPLIER_REPOSITORY, SupplierRepository } from '@supplier/repositories';
import { SUPPLIER_METRICS_SERVICE, SupplierMetricsService, SupplierService } from '@supplier/services';
import { SUPPLIER_QUERY_HANDLERS } from '@supplier/queries';
import { SUPPLIER_COMMAND_HANDLERS } from '@supplier/commands';
import { SupplierGrpcController } from '@supplier/adapters';
import { SupplierMetricsController } from '@supplier/supplier-metrics.controller';

@Module({
   imports: [
      EventEmitterModule.forRoot({
         wildcard: true,
         delimiter: '.',
      }),
      SupplierConfigModule,
      SupplierLoggerModule,
      PrismaModule,
      UnitOfWorkModule,
      RedisModule,
      RmqModule,
      GrpcHealthModule,
   ],
   controllers: [SupplierGrpcController, SupplierMetricsController],
   providers: [
      // Repositories
      SupplierRepository,
      {
         provide: SUPPLIER_REPOSITORY,
         useExisting: SupplierRepository,
      },

      // Domain & Application Services
      SupplierService,
      SupplierMetricsService,
      {
         provide: SUPPLIER_METRICS_SERVICE,
         useExisting: SupplierMetricsService,
      },
      {
         provide: GRPC_METRICS_COLLECTOR,
         useExisting: SupplierMetricsService,
      },

      // Interceptors & Guards
      GrpcLoggingInterceptor,
      GrpcMetricsInterceptor,
      GrpcJwtAuthGuard,

      // CQRS Command Bus & Handlers
      CommandBus,
      {
         provide: COMMAND_BUS,
         useExisting: CommandBus,
      },
      ...SUPPLIER_QUERY_HANDLERS,
      ...SUPPLIER_COMMAND_HANDLERS,
   ],
   exports: [SupplierService, SupplierMetricsService, SUPPLIER_REPOSITORY],
})
export class SupplierModule implements OnModuleInit {
   constructor(
      private readonly commandBus: CommandBus,
      private readonly moduleRef: ModuleRef,
   ) {}

   onModuleInit(): void {
      const allHandlers = [...SUPPLIER_QUERY_HANDLERS, ...SUPPLIER_COMMAND_HANDLERS];
      for (const handlerClass of allHandlers) {
         const handler = this.moduleRef.get<ICommandHandler<never, never>>(handlerClass, { strict: false });
         if (handler) {
            this.commandBus.registerHandler(handler);
         }
      }
   }
}
