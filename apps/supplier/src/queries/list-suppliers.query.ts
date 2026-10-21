import { Command } from '@common';
import type { ListSuppliersQueryDto, ListSuppliersResponseDto } from '@contracts/supplier';

export class ListSuppliersQuery extends Command<ListSuppliersResponseDto> {
   constructor(public readonly dto: ListSuppliersQueryDto) {
      super();
   }
}
