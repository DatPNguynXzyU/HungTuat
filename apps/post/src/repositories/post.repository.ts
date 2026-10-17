import { Injectable } from '@nestjs/common';
import { Prisma, PostStatus, Visibility } from '@post/prisma-client';
import { PrismaService } from '@post/prisma';
import { PostEntity, PostIngredientEntity } from '@post/entities';
import { IFeedQueryResult, IFindFeedParams, IPostRepository } from '@post/repositories/post.repository.interface';

@Injectable()
export class PostRepository implements IPostRepository {
   constructor(private readonly prisma: PrismaService) {}

   async findFeed(params: IFindFeedParams): Promise<IFeedQueryResult> {
      const { cursor, limit, userId, tag, category } = params;

      const where: Prisma.PostWhereInput = {
         status: PostStatus.PUBLISHED,
         visibility: Visibility.PUBLIC,
      };

      if (userId) {
         where.userId = userId;
      }

      if (category) {
         where.categories = {
            some: {
               OR: [{ categoryId: category }, { category: { slug: category } }],
            },
         };
      }

      if (tag) {
         where.tags = {
            some: {
               tag: {
                  OR: [{ slug: tag }, { name: tag }],
               },
            },
         };
      }

      if (cursor) {
         where.AND = [
            {
               OR: [
                  {
                     createdAt: {
                        lt: cursor.createdAt,
                     },
                  },
                  {
                     createdAt: cursor.createdAt,
                     postId: {
                        lt: cursor.postId,
                     },
                  },
               ],
            },
         ];
      }

      // Fetch limit + 1 to determine if next page exists, include ingredients ordered by sortOrder
      const records = await this.prisma.post.findMany({
         where,
         take: limit + 1,
         orderBy: [{ createdAt: 'desc' }, { postId: 'desc' }],
         include: {
            ingredients: {
               orderBy: { sortOrder: 'asc' },
            },
         },
      });

      const hasMore = records.length > limit;
      const slicedRecords = hasMore ? records.slice(0, limit) : records;
      const items = slicedRecords.map((item) => new PostEntity(item));

      let nextCursor: { createdAt: Date; postId: string } | null = null;
      if (hasMore && items.length > 0) {
         const lastItem = items[items.length - 1];
         nextCursor = {
            createdAt: lastItem.createdAt,
            postId: lastItem.postId,
         };
      }

      return {
         items,
         nextCursor,
         hasMore,
      };
   }

   async findById(postId: string): Promise<PostEntity | null> {
      const post = await this.prisma.post.findUnique({
         where: { postId },
         include: {
            ingredients: {
               orderBy: { sortOrder: 'asc' },
            },
         },
      });

      if (!post) {
         return null;
      }

      return new PostEntity(post);
   }

   async findIngredientsByPostId(postId: string): Promise<PostIngredientEntity[]> {
      const records = await this.prisma.postIngredient.findMany({
         where: { postId },
         orderBy: { sortOrder: 'asc' },
      });

      return records.map((record) => new PostIngredientEntity(record));
   }
}
