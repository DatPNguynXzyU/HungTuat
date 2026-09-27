import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '@common/guards/jwt-auth.guard';
import { JwtPayload } from '@common/utils/jwt.util';

export const CurrentUser = createParamDecorator((data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
   const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
   const user = request.user;

   if (!user) {
      return null;
   }

   return data ? user[data] : user;
});
