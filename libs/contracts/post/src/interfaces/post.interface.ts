export interface IPostCursor {
   createdAt: string;
   postId: string;
}

export interface IPostFeedFilter {
   cursor?: string;
   limit?: number;
   userId?: string;
   tag?: string;
   category?: string;
}

export interface IPostFeedResult<T> {
   items: T[];
   nextCursor: string | null;
   hasMore: boolean;
}
