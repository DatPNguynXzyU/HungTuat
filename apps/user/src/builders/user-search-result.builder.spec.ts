import { UserSearchResultItemBuilder } from '@user/builders/user-search-result.builder';

describe('UserSearchResultItemBuilder', () => {
   it('should build UserSearchResultItemDto from individual properties', () => {
      const item = UserSearchResultItemBuilder.create()
         .withUserId('u-100')
         .withUsername('charlie')
         .withDisplayName('Charlie Chaplin')
         .withAvatar('https://avatar.com/charlie.png')
         .withBio('Comedy Legend')
         .withIsVerified(true)
         .withFollowersCount(1000)
         .withFollowingCount(50)
         .build();

      expect(item).toEqual({
         userId: 'u-100',
         username: 'charlie',
         displayName: 'Charlie Chaplin',
         avatar: 'https://avatar.com/charlie.png',
         bio: 'Comedy Legend',
         isVerified: true,
         followersCount: 1000,
         followingCount: 50,
         isFollowing: false,
         isFollower: false,
         isSelf: false,
      });
   });

   it('should hydrate from search index document and enrich with relationship context', () => {
      const doc = {
         userId: 'target-user-1',
         username: 'targetuser',
         displayName: 'Target User',
         avatar: 'https://cdn.com/target.png',
         bio: 'Target Bio',
         isVerified: true,
         followersCount: 500,
         followingCount: 200,
      };

      const followingSet = new Set(['target-user-1']);
      const followerSet = new Set(['other-user']);

      const item = UserSearchResultItemBuilder.create()
         .fromDocument(doc)
         .withRelationshipContext({
            currentUserId: 'viewer-user-1',
            followingSet,
            followerSet,
         })
         .build();

      expect(item.userId).toBe('target-user-1');
      expect(item.isFollowing).toBe(true);
      expect(item.isFollower).toBe(false);
      expect(item.isSelf).toBe(false);
   });

   it('should detect when user is viewing their own profile in search results', () => {
      const doc = {
         userId: 'current-user-1',
         username: 'myself',
      };

      const item = UserSearchResultItemBuilder.create()
         .fromDocument(doc)
         .withRelationshipContext({
            currentUserId: 'current-user-1',
         })
         .build();

      expect(item.isSelf).toBe(true);
      expect(item.isFollowing).toBe(false);
      expect(item.isFollower).toBe(false);
   });
});
