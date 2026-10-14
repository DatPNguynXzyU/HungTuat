import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UserDateOfBirthResponseDto {
   @ApiProperty({
      description: 'User unique identifier (UUIDv7)',
      example: '018dc3bc-11a2-7f28-9842-bc08684d0001',
      format: 'uuid',
   })
   @IsString()
   @IsUUID()
   @IsNotEmpty()
   userId!: string;

   @ApiProperty({
      description: 'User date of birth formatted as ISO 8601 string (or null if not provided)',
      example: '1995-06-15T00:00:00.000Z',
      nullable: true,
      type: String,
      format: 'date-time',
   })
   @IsOptional()
   @IsDateString()
   dateOfBirth!: Date | string | null;

   @ApiProperty({
      description: 'Calculated current age in full completed solar years (or null if date of birth is not set)',
      example: 31,
      nullable: true,
      required: false,
   })
   @IsOptional()
   @IsInt()
   @Min(0)
   age?: number | null;
}
