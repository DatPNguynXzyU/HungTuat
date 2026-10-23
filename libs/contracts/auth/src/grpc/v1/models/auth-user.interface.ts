export interface IAuthUserProto {
   userId: string;
   email: string;
   roles: string[];
   status?: string;
   isEmailVerified?: boolean;
   lastLoginAt?: string;
   createdAt: string;
   updatedAt?: string;
}
