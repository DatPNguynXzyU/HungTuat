import type { IDeviceInfoProto } from '../models/auth-device.interface';

export interface ISendRegisterOtpRequest {
   email: string;
   deviceInfo?: IDeviceInfoProto;
}

export interface ISendRegisterOtpResponse {
   success: boolean;
   message: string;
   cooldownSeconds: number;
   expiresInMinutes: number;
}

export interface IVerifyRegisterOtpRequest {
   email: string;
   otp: string;
   deviceInfo?: IDeviceInfoProto;
}

export interface IVerifyRegisterOtpResponse {
   success: boolean;
   verificationToken: string;
   expiresInSeconds: number;
}

export interface IRegisterRequest {
   email: string;
   password: string;
   confirmPassword?: string;
   verificationToken: string;
   deviceInfo?: IDeviceInfoProto;
}
