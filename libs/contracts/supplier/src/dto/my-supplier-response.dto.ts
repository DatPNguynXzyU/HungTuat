import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DEFAULT_ROLES, DEFAULT_SUPPLIER_ROLES, type SupplierRole } from '@common';
import { SUPPLIER_MEMBER_STATUS, type SupplierMemberStatusType } from '@contracts/supplier/constants/status.constant';
import { SupplierItemDto } from '@contracts/supplier/dto/supplier-item.dto';

export class MySupplierResponseDto {
   @ApiProperty({
      description: 'Whether the authenticated account has completed supplier store onboarding',
      example: true,
   })
   hasSupplier!: boolean;

   @ApiPropertyOptional({
      description: 'Supplier profile details if registered, or null if onboarding is pending or required',
      type: SupplierItemDto,
      nullable: true,
   })
   supplier!: SupplierItemDto | null;

   @ApiPropertyOptional({
      description: 'Role of the member within the supplier store',
      enum: DEFAULT_SUPPLIER_ROLES,
      example: DEFAULT_ROLES.SUPPLIER_ADMIN,
   })
   role?: SupplierRole;

   @ApiPropertyOptional({
      description: 'Member account status',
      enum: SUPPLIER_MEMBER_STATUS,
      example: SUPPLIER_MEMBER_STATUS.ACTIVE,
   })
   memberStatus?: SupplierMemberStatusType;
}
