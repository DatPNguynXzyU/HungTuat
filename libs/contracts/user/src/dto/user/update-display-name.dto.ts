import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDisplayNameDto {
   @ApiProperty({
      example: 'Johnathan Doe',
      description: 'User display name (2-50 characters)',
      minLength: 2,
      maxLength: 50,
   })
   @IsNotEmpty({ message: 'Display name is required' })
   @IsString({ message: 'Display name must be a string' })
   @MinLength(2, { message: 'Display name must be at least 2 characters long' })
   @MaxLength(50, { message: 'Display name cannot exceed 50 characters' })
   displayName!: string;
}
