import { firstValueFrom } from 'rxjs';
import { CurrencyEnum, INGREDIENT_STATUS } from '@contracts/commerce';
import { SearchGrpcController } from './search-grpc.controller';
import type { UserSearchService, UserDocument } from '@search/domains/user-search/user-search.service';
import type {
   IngredientSearchService,
   IngredientDocument,
} from '@search/domains/ingredient-search/ingredient-search.service';

describe('SearchGrpcController', () => {
   let controller: SearchGrpcController;

   const mockUserSearchService = {
      searchUsers: jest.fn(),
   };

   const mockIngredientSearchService = {
      searchIngredients: jest.fn(),
   };

   beforeEach(() => {
      jest.clearAllMocks();

      controller = new SearchGrpcController(
         mockUserSearchService as unknown as UserSearchService,
         mockIngredientSearchService as unknown as IngredientSearchService,
      );
   });

   describe('searchUsers', () => {
      it('should search users and map response to proto format', async () => {
         const mockUser: UserDocument = {
            id: 'u-123',
            email: 'test@example.com',
            username: 'testuser',
            displayName: 'Test User',
            avatar: 'https://example.com/avatar.jpg',
            bio: 'Hello world',
            isVerified: true,
            followersCount: 10,
            followingCount: 5,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
         };

         mockUserSearchService.searchUsers.mockResolvedValue({
            items: [mockUser],
            nextCursor: 'next-1',
            hasMore: true,
            total: 100,
         });

         const response$ = controller.searchUsers({
            query: 'test',
            limit: 10,
            cursor: 'cur-0',
         });

         const result = await firstValueFrom(response$);

         expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith('test', 10, 'cur-0');
         expect(result.items).toHaveLength(1);
         expect(result.items[0].userId).toBe('u-123');
         expect(result.items[0].documentId).toBe('u-123');
         expect(result.items[0].username).toBe('testuser');
         expect(result.nextCursor).toBe('next-1');
         expect(result.hasMore).toBe(true);
         expect(result.total).toBe(100);
      });
   });

   describe('searchIngredients', () => {
      it('should search ingredients and map response to proto format', async () => {
         const mockDoc: IngredientDocument = {
            ingredientId: 'ing-1',
            ingredientName: 'Garlic',
            normalizedName: 'garlic',
            ingredientSlug: 'garlic',
            ingredientDescription: 'Fresh garlic',
            ingredientImageUrl: 'https://img.com/garlic.jpg',
            categoryId: 'cat-1',
            categoryName: 'Spices',
            defaultUnit: 'g',
            ingredientStatus: INGREDIENT_STATUS.ACTIVE,
            supplierCount: 3,
            minPrice: 10,
            maxPrice: 20,
            currency: CurrencyEnum.USD,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
         };

         mockIngredientSearchService.searchIngredients.mockResolvedValue({
            items: [mockDoc],
            total: 1,
            limit: 20,
            offset: 0,
         });

         const response$ = controller.searchIngredients({
            query: 'garlic',
            categoryId: 'cat-1',
            limit: 20,
            offset: 0,
         });

         const result = await firstValueFrom(response$);

         expect(mockIngredientSearchService.searchIngredients).toHaveBeenCalledWith({
            query: 'garlic',
            categoryId: 'cat-1',
            limit: 20,
            offset: 0,
         });
         expect(result.items).toHaveLength(1);
         expect(result.items[0].ingredientId).toBe('ing-1');
         expect(result.items[0].ingredientName).toBe('Garlic');
         expect(result.total).toBe(1);
      });
   });

   describe('globalSearch', () => {
      it('should search both users and ingredients in parallel', async () => {
         mockUserSearchService.searchUsers.mockResolvedValue({
            items: [],
            nextCursor: null,
            hasMore: false,
            total: 0,
         });

         mockIngredientSearchService.searchIngredients.mockResolvedValue({
            items: [],
            total: 0,
            limit: 10,
            offset: 0,
         });

         const response$ = controller.globalSearch({
            query: 'anything',
            limit: 10,
         });

         const result = await firstValueFrom(response$);

         expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith('anything', 10);
         expect(mockIngredientSearchService.searchIngredients).toHaveBeenCalledWith({
            query: 'anything',
            limit: 10,
         });
         expect(result.users).toEqual([]);
         expect(result.ingredients).toEqual([]);
         expect(result.total).toBe(0);
      });
   });
});
