/**
 * Make a set of properties in `T` optional while keeping the remaining properties as-is.
 *
 * @example
 * ```ts
 * interface User {
 *    id: string;
 *    email: string;
 *    createdAt: string;
 * }
 *
 * type CreateUser = SetOptional<User, 'id' | 'createdAt'>;
 * // { email: string; id?: string; createdAt?: string }
 * ```
 */
export type SetOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make a set of properties in `T` required while keeping the remaining properties as-is.
 *
 * @example
 * ```ts
 * interface Options {
 *    timeout?: number;
 *    retries?: number;
 * }
 *
 * type StrictOptions = SetRequired<Options, 'timeout'>;
 * // { retries?: number; timeout: number }
 * ```
 */
export type SetRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
