import { Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaClient } from '@post/prisma-client';
import { PostConfigService } from '@post/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

type PrismaClientOptions = {
   adapter?: PrismaPg;
   datasources?: {
      db?: {
         url?: string;
      };
   };
};

interface IPrismaClient {
   $connect(): Promise<void>;
   $disconnect(): Promise<void>;
   [key: string]: unknown;
}

interface PrismaClientConstructor {
   new (options?: PrismaClientOptions): IPrismaClient;
}

const PrismaClientCtor = PrismaClient as unknown as PrismaClientConstructor;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
   private client: IPrismaClient;
   private pool?: Pool;

   constructor(@Optional() configService?: PostConfigService) {
      const url = configService?.databaseUrl || process.env.DATABASE_URL;
      let options: PrismaClientOptions | undefined;

      if (url) {
         this.pool = new Pool({ connectionString: url });
         const adapter = new PrismaPg(this.pool);
         options = { adapter };
      }

      this.client = new PrismaClientCtor(options);

      return new Proxy(this, {
         get: (target, prop: string | symbol) => {
            if (prop in target) {
               return Reflect.get(target, prop) as unknown;
            }
            return Reflect.get(target.client, prop) as unknown;
         },
      });
   }

   async onModuleInit(): Promise<void> {
      await this.client.$connect();
   }

   async onModuleDestroy(): Promise<void> {
      await this.client.$disconnect();
      if (this.pool) {
         await this.pool.end();
      }
   }
}
