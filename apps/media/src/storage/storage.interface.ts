import {
   MEDIA_PROVIDERS,
   type MediaProvider,
   type IGenerateUploadOptions,
   type IUploadOptions,
   type IUploadSignatureResult,
   type IStorageUploadResult,
} from '@contracts/media';

export type GenerateUploadOptions = IGenerateUploadOptions;
export type UploadOptions = IUploadOptions;
export type UploadSignatureResult = IUploadSignatureResult;
export type StorageUploadResult = IStorageUploadResult;

export interface IStorageProvider {
   readonly provider: MediaProvider;
   generateUploadUrl(options: IGenerateUploadOptions): Promise<IUploadSignatureResult>;
   uploadBuffer(buffer: Buffer, options: IUploadOptions): Promise<IStorageUploadResult>;
   uploadBase64(base64Data: string, options: IUploadOptions): Promise<IStorageUploadResult>;
   deleteFile(key: string): Promise<boolean>;
   getPublicUrl(key: string): string;
}

export const STORAGE_PROVIDERS = {
   CLOUDINARY: MEDIA_PROVIDERS.CLOUDINARY,
   CLOUDFLARE_R2: MEDIA_PROVIDERS.CLOUDFLARE_R2,
} as const;
