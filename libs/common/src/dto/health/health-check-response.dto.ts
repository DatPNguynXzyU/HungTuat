import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckResponseDto {
   @ApiProperty({
      description: 'Health status identifier',
      example: 'ok',
   })
   status!: string;

   @ApiProperty({
      description: 'Process uptime in seconds',
      example: 124.5,
   })
   uptime!: number;

   @ApiProperty({
      description: 'Current UTC timestamp when health probe ran',
      example: '2026-10-11T09:41:51.000Z',
   })
   timestamp!: string;
}
