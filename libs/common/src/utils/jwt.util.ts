import jwt, { type SignOptions, type VerifyOptions } from 'jsonwebtoken';

export interface JwtPayload {
   sub: string;
   email: string;
   fullName?: string;
   roles?: string[];
   tokenType?: 'access' | 'refresh';
   jti?: string;
   iat?: number;
   exp?: number;
   [key: string]: unknown;
}

export class JwtUtil {
   static sign(
      payload: Omit<JwtPayload, 'iat' | 'exp'> | JwtPayload,
      secret: string,
      expiresInSeconds: number = 86400,
      options?: Omit<SignOptions, 'expiresIn'>,
   ): string {
      const cleanPayload = { ...payload };
      delete cleanPayload.iat;
      delete cleanPayload.exp;

      const signOptions: SignOptions = {
         expiresIn: expiresInSeconds,
         ...options,
      };

      return jwt.sign(cleanPayload, secret, signOptions);
   }

   static verify(token: string, secret: string, options?: VerifyOptions): JwtPayload {
      const decoded = jwt.verify(token, secret, options);
      if (typeof decoded === 'string' || !decoded) {
         throw new Error('Invalid payload');
      }
      return decoded as JwtPayload;
   }

   static decode(token: string): JwtPayload | null {
      const decoded = jwt.decode(token);
      if (!decoded || typeof decoded === 'string') {
         return null;
      }
      return decoded as JwtPayload;
   }
}
