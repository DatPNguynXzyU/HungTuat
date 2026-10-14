export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

/**
 * Interface contract for password hashing and verification.
 * Follows Dependency Inversion Principle so domain services are decoupled from concrete crypto libraries.
 */
export interface IPasswordHasher {
   /**
    * Computes a cryptographically secure hash of a plain-text password.
    * @param password Plain-text password to hash
    * @returns Formatted hash string (e.g. Argon2id)
    */
   hash(password: string): Promise<string>;

   /**
    * Verifies whether a plain-text candidate password matches a hash.
    * @param hashedPassword Stored cryptographic hash
    * @param candidate Plain-text password submitted by user
    * @returns True if password matches hash, false otherwise
    */
   verify(hashedPassword: string, candidate: string): Promise<boolean>;
}
