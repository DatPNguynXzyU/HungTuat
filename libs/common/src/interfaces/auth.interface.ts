export interface IAuthUser {
   id: string;
   email: string;
   fullName: string;
   roles: string[];
   createdAt: string;
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
