import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '@common/guards/jwt-auth.guard';
import { JwtPayload } from '@common/utils/jwt.util';

export const extractCurrentAccount = (data: keyof JwtPayload | undefined, ctx: ExecutionContext): unknown => {
   const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
   const user = request?.user;

   if (!user) {
      return null;
   }

   if (data === 'id' || data === 'accountId' || data === 'sub') {
      return user.sub;
   }

   return data ? user[data] : user;
};

export const CurrentAccount = createParamDecorator(extractCurrentAccount);
