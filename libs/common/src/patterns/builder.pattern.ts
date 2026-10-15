/**
 * Generic builder interface following the Gang of Four (GoF) Builder pattern.
 * Enables step-by-step construction of complex representations and guarantees
 * the built product satisfies type safety upon invocation of `build()`.
 */
export interface IBuilder<T> {
   /**
    * Constructs and returns the final product instance.
    */
   build(): T;
}
