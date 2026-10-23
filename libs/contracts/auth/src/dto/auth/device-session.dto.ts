import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class DeviceSessionResponseDto {
   @IsString()
   @IsUUID()
   @ApiProperty({ example: '8f6b219e-9764-4e2b-bbd8-f682f6e913a8', description: 'Session unique ID' })
   sessionId: string;

   @ApiPropertyOptional({ example: 'desktop', description: 'Device type (desktop, mobile, tablet, bot)' })
   deviceType?: string | null;

   @ApiPropertyOptional({ example: 'Chrome on macOS', description: 'Friendly device and browser name' })
   deviceName?: string | null;

   @ApiPropertyOptional({ example: 'Chrome 122.0', description: 'Browser family and version' })
   browser?: string | null;

   @ApiPropertyOptional({ example: 'macOS 14.3', description: 'Operating system and version' })
   os?: string | null;

   @ApiPropertyOptional({ example: '113.161.72.10', description: 'Client IP address' })
   ipAddress?: string | null;

   @ApiPropertyOptional({ example: 'Ho Chi Minh City', description: 'City name' })
   city?: string | null;

   @ApiPropertyOptional({ example: 'SG', description: 'Region / State code' })
   region?: string | null;

   @ApiPropertyOptional({ example: 'Vietnam', description: 'Country name' })
   country?: string | null;

   @ApiPropertyOptional({ example: 'VN', description: 'Country code ISO2' })
   countryCode?: string | null;

   @ApiPropertyOptional({ example: 'Mozilla/5.0...', description: 'Raw User-Agent string' })
   userAgent?: string | null;

   @ApiProperty({ example: true, description: 'Whether this session is the current requesting session' })
   isCurrent: boolean;

   @ApiProperty({ example: '2026-09-28T08:00:00.000Z', description: 'Last active ISO timestamp' })
   lastActiveAt: string;

   @ApiProperty({ example: '2026-10-05T08:00:00.000Z', description: 'Session expiration ISO timestamp' })
   expiresAt: string;

   @ApiProperty({ example: '2026-09-28T08:00:00.000Z', description: 'Session creation ISO timestamp' })
   createdAt: string;
}
