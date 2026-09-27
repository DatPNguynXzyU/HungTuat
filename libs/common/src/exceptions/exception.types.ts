import { IValidationErrorDetail } from '@common/interfaces/response.interface';

export interface IAppExceptionOptions {
   errorCode: string;
   statusCode?: number;
   message?: string;
   params?: Record<string, unknown>;
   details?: unknown;
   errors?: IValidationErrorDetail[];
   cause?: Error;
}

export interface IAppExceptionPayload {
   statusCode: number;
   errorCode: string;
   message: string;
   params?: Record<string, unknown>;
   details?: unknown;
   errors?: IValidationErrorDetail[];
}

export type AppExceptionInput = string | IAppExceptionOptions;
