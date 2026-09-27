export interface IAuthUser {
   id: string;
   email: string;
   fullName: string;
   roles: string[];
   status?: string;
   isEmailVerified?: boolean;
   lastLoginAt?: string | null;
   createdAt: string;
   updatedAt?: string;
}

export interface IAuthResult {
   user: IAuthUser;
   accessToken: string;
   refreshToken: string;
}

export interface IValidateTokenResult {
   valid: boolean;
   user: IAuthUser;
}

export interface IRevokeTokenResult {
   success: boolean;
   message: string;
}
