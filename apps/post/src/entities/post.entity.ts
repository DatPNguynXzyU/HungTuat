import {
   Post as PrismaPost,
   PostIngredient as PrismaPostIngredient,
   PostStatus,
   Visibility,
} from '@post/prisma-client';
import { PostIngredientEntity } from '@post/entities/post-ingredient.entity';

export class PostEntity implements PrismaPost {
   postId: string;
   userId: string;
   title: string;
   caption: string | null;
   status: PostStatus;
   visibility: Visibility;
   mediaId: string | null;
   videoUrl: string;
   playbackUrl: string | null;
   thumbnailUrl: string;
   blurHash: string | null;
   duration: number;
   videoWidth: number | null;
   videoHeight: number | null;
   viewCount: number;
   likeCount: number;
   commentCount: number;
   shareCount: number;
   saveCount: number;
   allowComments: boolean;
   allowDuet: boolean;
   createdAt: Date;
   updatedAt: Date;
   publishedAt: Date | null;
   ingredients: PostIngredientEntity[];

   constructor(partial: Partial<PrismaPost> & { ingredients?: Partial<PrismaPostIngredient>[] }) {
      this.postId = partial.postId || '';
      this.userId = partial.userId || '';
      this.title = partial.title || '';
      this.caption = partial.caption ?? null;
      this.status = partial.status || PostStatus.PUBLISHED;
      this.visibility = partial.visibility || Visibility.PUBLIC;
      this.mediaId = partial.mediaId ?? null;
      this.videoUrl = partial.videoUrl || '';
      this.playbackUrl = partial.playbackUrl ?? null;
      this.thumbnailUrl = partial.thumbnailUrl || '';
      this.blurHash = partial.blurHash ?? null;
      this.duration = partial.duration ?? 0;
      this.videoWidth = partial.videoWidth ?? null;
      this.videoHeight = partial.videoHeight ?? null;
      this.viewCount = partial.viewCount ?? 0;
      this.likeCount = partial.likeCount ?? 0;
      this.commentCount = partial.commentCount ?? 0;
      this.shareCount = partial.shareCount ?? 0;
      this.saveCount = partial.saveCount ?? 0;
      this.allowComments = partial.allowComments ?? true;
      this.allowDuet = partial.allowDuet ?? false;
      this.createdAt = partial.createdAt || new Date();
      this.updatedAt = partial.updatedAt || new Date();
      this.publishedAt = partial.publishedAt ?? null;
      this.ingredients = (partial.ingredients || []).map((item) => new PostIngredientEntity(item));
   }
}
