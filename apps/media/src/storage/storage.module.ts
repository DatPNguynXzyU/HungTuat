import { Module } from '@nestjs/common';
import { CloudinaryProvider } from './providers/cloudinary.provider';
import { CloudflareR2Provider } from './providers/r2.provider';
import { StorageStrategyFactory } from './storage-strategy.factory';

@Module({
   providers: [CloudinaryProvider, CloudflareR2Provider, StorageStrategyFactory],
   exports: [CloudinaryProvider, CloudflareR2Provider, StorageStrategyFactory],
})
export class StorageModule {}
