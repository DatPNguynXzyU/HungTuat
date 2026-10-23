import type { IDeviceInfoProto } from '../models/auth-device.interface';

export interface IChangePasswordRequest {
   userId: string;
   currentPassword: string;
   newPassword: string;
   confirmPassword: string;
   logoutAll?: boolean;
   deviceInfo?: IDeviceInfoProto;
}

export interface IChangePasswordResponse {
   success: boolean;
   message: string;
   cooldownSeconds: number;
   expiresInMinutes: number;
}

export interface IVerifyChangePasswordOtpRequest {
   userId: string;
   otp: string;
   deviceInfo?: IDeviceInfoProto;
}

export interface IVerifyChangePasswordOtpResponse {
   success: boolean;
   message: string;
   logoutAll?: boolean;
}
