import { Module } from '@nestjs/common';
import { USER_DOMAIN_EVENT_FACTORY, USER_CQRS_EVENT_FACTORY, USER_SPECIFICATION_FACTORY } from '@user/constants';
import { UserDomainEventFactory } from '@user/factories/user-domain-event.factory';
import { UserCqrsEventFactory } from '@user/factories/user-cqrs-event.factory';
import { UserSpecificationFactory } from '@user/factories/user-specification.factory';

@Module({
   providers: [
      UserDomainEventFactory,
      {
         provide: USER_DOMAIN_EVENT_FACTORY,
         useClass: UserDomainEventFactory,
      },
      UserCqrsEventFactory,
      {
         provide: USER_CQRS_EVENT_FACTORY,
         useClass: UserCqrsEventFactory,
      },
      UserSpecificationFactory,
      {
         provide: USER_SPECIFICATION_FACTORY,
         useClass: UserSpecificationFactory,
      },
   ],
   exports: [
      UserDomainEventFactory,
      USER_DOMAIN_EVENT_FACTORY,
      UserCqrsEventFactory,
      USER_CQRS_EVENT_FACTORY,
      UserSpecificationFactory,
      USER_SPECIFICATION_FACTORY,
   ],
})
export class UserFactoriesModule {}
