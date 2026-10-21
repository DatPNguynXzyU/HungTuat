import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CommandBus, RmqService } from '@common';
import { NOTIFICATION_EVENTS } from '@contracts/notification';
import { HandleSupplierRegisteredCommand } from '@supplier/commands';

@Controller()
export class SupplierRmqController {
   private readonly logger = new Logger(SupplierRmqController.name);

   constructor(
      private readonly commandBus: CommandBus,
      private readonly rmqService: RmqService,
   ) {}

   @EventPattern(NOTIFICATION_EVENTS.SUPPLIER_REGISTERED)
   async handleSupplierRegistered(
      @Payload() data: { accountId: string; email: string; role?: string },
      @Ctx() context?: RmqContext,
   ) {
      try {
         this.logger.log(`Received SUPPLIER_REGISTERED event for account ${data?.accountId} (${data?.email})`);
         const result = await this.commandBus.execute(new HandleSupplierRegisteredCommand(data));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         this.logger.error(`Error handling SUPPLIER_REGISTERED event for account ${data?.accountId}`, error);
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }
}
