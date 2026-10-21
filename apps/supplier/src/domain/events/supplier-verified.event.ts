export class SupplierVerifiedEvent {
   constructor(
      public readonly supplierId: string,
      public readonly isVerified: boolean,
   ) {}
}
