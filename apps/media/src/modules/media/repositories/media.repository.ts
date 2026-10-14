import { Injectable } from '@nestjs/common';
import type { Media, Prisma } from '@media/prisma-client';
import { PrismaService } from '@media/prisma';
import type { IMediaRepository } from './media.repository.interface';

@Injectable()
export class MediaRepository implements IMediaRepository {
   constructor(private readonly prisma: PrismaService) {}

   async findById(id: string): Promise<Media | null> {
      return this.prisma.media.findUnique({
         where: { id },
      });
   }

   async create(data: Prisma.MediaCreateInput): Promise<Media> {
      return this.prisma.media.create({
         data,
      });
   }

   async update(id: string, data: Prisma.MediaUpdateInput): Promise<Media> {
      return this.prisma.media.update({
         where: { id },
         data,
      });
   }

   async delete(id: string): Promise<Media> {
      return this.prisma.media.delete({
         where: { id },
      });
   }

   async findByUserId(userId: string): Promise<Media[]> {
      return this.prisma.media.findMany({
         where: { userId },
         orderBy: { createdAt: 'desc' },
      });
   }
}
