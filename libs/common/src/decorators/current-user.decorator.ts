import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '@common/guards/jwt-auth.guard';
import { JwtPayload } from '@common/utils/jwt.util';

export const extractCurrentUser = (data: keyof JwtPayload | undefined, ctx: ExecutionContext): unknown => {
   const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
   const user = request?.user;

   if (!user) {
      return null;
   }

   if (data === 'id' || data === 'userId' || data === 'sub') {
      return user.sub;
   }

   return data ? user[data] : user;
};

export const CurrentUser = createParamDecorator(extractCurrentUser);
