import type { Media, Prisma } from '@media/prisma-client';

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');

export interface IMediaRepository {
   findById(id: string): Promise<Media | null>;
   create(data: Prisma.MediaCreateInput): Promise<Media>;
   update(id: string, data: Prisma.MediaUpdateInput): Promise<Media>;
   delete(id: string): Promise<Media>;
   findByUserId(userId: string): Promise<Media[]>;
}
