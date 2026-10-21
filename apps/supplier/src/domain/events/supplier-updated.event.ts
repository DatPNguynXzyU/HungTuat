export class SupplierUpdatedEvent {
   constructor(
      public readonly supplierId: string,
      public readonly supplierName: string,
   ) {}
}
