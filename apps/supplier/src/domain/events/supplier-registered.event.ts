export class SupplierRegisteredEvent {
   constructor(
      public readonly supplierId: string,
      public readonly supplierName: string,
      public readonly supplierCode: string,
   ) {}
}
