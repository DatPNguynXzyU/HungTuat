export const USERNAME_BLOOM_FILTER_SERVICE = Symbol('USERNAME_BLOOM_FILTER_SERVICE');

export interface IUsernameBloomFilterService {
   initFilter(): Promise<void>;
   syncFromDatabase(): Promise<number>;
   rebuildFilter(): Promise<number>;
   mightContain(username: string): Promise<boolean>;
   addUsername(username: string): Promise<void>;
   updateUsername(newUsername: string, oldUsername?: string | null): Promise<void>;
   removeUsername(username: string): Promise<void>;
   isUsernameAvailable(username: string): Promise<boolean>;
}
