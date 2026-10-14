import { Module } from '@nestjs/common';
import { CloudinaryProvider } from '@media/storage/providers/cloudinary.provider';
import { CloudflareR2Provider } from '@media/storage/providers/r2.provider';
import { StorageStrategyFactory } from '@media/storage/storage-strategy.factory';

@Module({
   providers: [CloudinaryProvider, CloudflareR2Provider, StorageStrategyFactory],
   exports: [CloudinaryProvider, CloudflareR2Provider, StorageStrategyFactory],
})
export class StorageModule {}
