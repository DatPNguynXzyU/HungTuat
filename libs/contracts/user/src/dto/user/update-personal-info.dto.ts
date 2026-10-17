import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { GenderDto } from '@contracts/user/dto/user/update-user.dto';

export class UpdatePersonalInfoDto {
   @ApiPropertyOptional({
      example: '2000-01-15',
      description: 'Date of birth (ISO 8601 format: YYYY-MM-DD)',
   })
   @IsOptional()
   @IsDateString({}, { message: 'Date of birth must be a valid ISO date string (YYYY-MM-DD)' })
   dateOfBirth?: string;

   @ApiPropertyOptional({
      example: GenderDto.MALE,
      enum: GenderDto,
      description: 'User gender orientation',
   })
   @IsOptional()
   @IsEnum(GenderDto, { message: 'Gender must be MALE, FEMALE, OTHER, or PREFER_NOT_TO_SAY' })
   gender?: GenderDto;
}
