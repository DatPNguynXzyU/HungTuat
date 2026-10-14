import type { MediaProvider, MediaStatus, MediaType } from '../constants/media.constant';

export interface IMedia {
   id: string;
   userId: string;
   provider: MediaProvider;
   type: MediaType;
   status: MediaStatus;
   url: string;
   key: string;
   mimeType: string;
   size: number;
   width?: number | null;
   height?: number | null;
   metadata?: Record<string, unknown> | null;
   createdAt: Date;
   updatedAt: Date;
}

export interface IGenerateUploadOptions {
   key: string;
   mimeType: string;
   type?: MediaType;
   size?: number;
   folder?: string;
   userId?: string;
   tags?: string[];
}

export interface IUploadOptions {
   key: string;
   mimeType?: string;
   folder?: string;
   tags?: string[];
   transformation?: Record<string, unknown>[];
}

export interface IUploadSignatureResult {
   provider: MediaProvider;
   method: 'PUT' | 'POST';
   uploadUrl?: string;
   publicUrl: string;
   key: string;
   signature?: string;
   timestamp?: number;
   apiKey?: string;
   cloudName?: string;
   headers?: Record<string, string>;
}

export interface IStorageUploadResult {
   provider: MediaProvider;
   key: string;
   url: string;
   format?: string;
   bytes?: number;
   width?: number;
   height?: number;
}

export interface IDeleteMediaResult {
   success: boolean;
}
