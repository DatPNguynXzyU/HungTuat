import {
   Body,
   Controller,
   Get,
   HttpStatus,
   Param,
   Patch,
   Post,
   Query,
   UploadedFile,
   UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
   ApiBearerAuth,
   ApiBody,
   ApiConsumes,
   ApiCookieAuth,
   ApiOperation,
   ApiParam,
   ApiQuery,
   ApiResponse,
   ApiTags,
} from '@nestjs/swagger';
import {
   ApiErrorResponse,
   ApiErrorResponses,
   BadRequestException,
   COMMON_ERROR_CODES,
   CurrentUser,
   Public,
   ResponseMessage,
} from '@common';
import {
   AvatarSignatureResponseDto,
   CheckUsernameResponseDto,
   CreateUserProfileDto,
   UpdateBioDto,
   UpdateCoverImageDto,
   UpdateDisplayNameDto,
   UpdateLocationDto,
   UpdatePersonalInfoDto,
   UpdateUsernameDto,
   UpdateWebsiteDto,
   USER_ERROR_CODES,
   USER_ERROR_REASONS,
   USER_RESPONSE_MESSAGES,
   UserAvatarUploadResponseDto,
   UserDateOfBirthResponseDto,
   UserResponseDto,
   UserSearchQueryDto,
   UserSearchResponseDto,
   UserSuggestionItemDto,
   UserSuggestionQueryDto,
} from '@contracts/user';
import { UsersService } from '@/modules/users/users.service';
import type { JwtPayload } from '@common/utils/jwt.util';

@ApiTags('Users')
@Controller('users')
export class UsersController {
   constructor(private readonly usersService: UsersService) {}

   @Public()
   @Get('check-username')
   @ApiOperation({
      operationId: 'checkUsername',
      summary: 'Check if a username is available using fast Bloom Filter',
   })
   @ApiQuery({ name: 'username', required: true, description: 'Username to verify availability', example: 'john_doe' })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Username availability status returned successfully.',
      type: CheckUsernameResponseDto,
   })
   @ApiErrorResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Username query parameter is missing or has invalid format',
      errorCodes: [USER_ERROR_CODES.INVALID_USERNAME_FORMAT],
      exampleParams: { reason: USER_ERROR_REASONS.USERNAME_REQUIRED },
   })
   @ResponseMessage(USER_RESPONSE_MESSAGES.CHECK_USERNAME_SUCCESS)
   async checkUsername(@Query('username') username: string): Promise<CheckUsernameResponseDto> {
      if (!username || !username.trim()) {
         throw new BadRequestException(USER_ERROR_CODES.INVALID_USERNAME_FORMAT, {
            params: { reason: USER_ERROR_REASONS.USERNAME_REQUIRED },
         });
      }
      return this.usersService.checkUsername(username);
   }

   @Public()
   @Get('search')
   @ApiOperation({
      operationId: 'searchUsers',
      summary: 'Search users by name or username using Elasticsearch with relevance boosting',
      description:
         'Search users using Elasticsearch inverted index with typo-tolerance, boosting username and displayName over bio. Automatically includes follow relationship flags for authenticated callers.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Matching users returned successfully with cursor pagination metadata for infinite scroll.',
      type: UserSearchResponseDto,
   })
   @ApiErrorResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid search query or cursor parameters',
      errorCodes: [COMMON_ERROR_CODES.INVALID_REQUEST, COMMON_ERROR_CODES.VALIDATION_FAILED],
   })
   @ResponseMessage(USER_RESPONSE_MESSAGES.SEARCH_SUCCESS)
   async searchUsers(@Query() queryDto: UserSearchQueryDto, @CurrentUser() user?: JwtPayload): Promise<unknown> {
      return this.usersService.searchUsers(queryDto.q, queryDto.limit, queryDto.cursor, user);
   }

   @Get('suggestions')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'getFollowSuggestions',
      summary: 'Get personalized friend and follow suggestions',
      description:
         'Retrieves friend suggestions using social graph 2-hop analysis (mutual connections), with automatic fallback to popular active users for new accounts (cold-start mitigation).',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Personalized user suggestions returned successfully.',
      type: [UserSuggestionItemDto],
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Invalid suggestion query parameters',
         errorCodes: [COMMON_ERROR_CODES.INVALID_REQUEST, COMMON_ERROR_CODES.VALIDATION_FAILED],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.GET_SUGGESTIONS_SUCCESS)
   async getFollowSuggestions(
      @Query() queryDto: UserSuggestionQueryDto,
      @CurrentUser() user: JwtPayload,
   ): Promise<unknown> {
      return this.usersService.getFollowSuggestions(queryDto.limit, user);
   }

   @Post('profile')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'createUserProfile',
      summary: 'Create initial user profile for the current authenticated user',
   })
   @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'User profile created successfully.',
      type: UserResponseDto,
      links: {
         GetMyProfile: {
            operationId: 'getMyUserProfile',
            description: 'Retrieve current user profile details created in this step',
         },
      },
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Validation failed for user profile fields',
         errorCodes: [COMMON_ERROR_CODES.VALIDATION_FAILED],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.CONFLICT,
         description: 'Profile already exists or username already taken',
         errorCodes: [USER_ERROR_CODES.USER_ALREADY_EXISTS, USER_ERROR_CODES.USERNAME_ALREADY_TAKEN],
         exampleParams: { username: 'john_doe' },
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.CREATE_PROFILE_SUCCESS)
   async createProfile(
      @Body() createUserProfileDto: CreateUserProfileDto,
      @CurrentUser() user: JwtPayload,
   ): Promise<unknown> {
      return this.usersService.createProfile(createUserProfileDto, user);
   }

   @Get()
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'getAllUsers',
      summary: 'Get list of users',
   })
   @ApiQuery({ name: 'page', required: false, type: Number })
   @ApiQuery({ name: 'limit', required: false, type: Number })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'List of users returned.',
      type: [UserResponseDto],
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Invalid pagination parameters',
         errorCodes: [COMMON_ERROR_CODES.INVALID_REQUEST],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.GET_LIST_SUCCESS)
   async getAllUsers(
      @Query('page') page = '1',
      @Query('limit') limit = '10',
      @CurrentUser() user: JwtPayload,
   ): Promise<unknown> {
      return this.usersService.getAllUsers(Number(page), Number(limit), user);
   }

   @Get('me')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'getMyUserProfile',
      summary: 'Get current authenticated user profile, statistics, and settings',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Current user profile returned successfully.',
      type: UserResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized if authentication is missing or invalid',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'User profile not found',
         errorCodes: [USER_ERROR_CODES.USER_NOT_FOUND],
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.GET_PROFILE_SUCCESS)
   async getMyProfile(@CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.getMyProfile(user);
   }

   @Get('me/date-of-birth')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'getMyDateOfBirth',
      summary: 'Get date of birth and age of current authenticated user from User Service',
      description:
         'Retrieves the date of birth and calculates current age in completed years from the user profile managed by User Service.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Current user date of birth details retrieved successfully.',
      type: UserDateOfBirthResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Authentication token missing, invalid, or expired.',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'User profile not found in User Service.',
         errorCodes: [USER_ERROR_CODES.USER_NOT_FOUND],
         exampleParams: { id: '018dc3bc-11a2-7f28-9842-bc08684d0001' },
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.GET_DATE_OF_BIRTH_SUCCESS)
   async getMyDateOfBirth(@CurrentUser('userId') userId: string): Promise<UserDateOfBirthResponseDto> {
      return this.usersService.getDateOfBirth(userId);
   }

   @Patch('me/username')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'updateMyUsername',
      summary: 'Update username with 30-day modification cooldown',
      description:
         'Updates unique handle/username for the authenticated user. Enforces a 30-day cooldown between username changes. Administrators bypass cooldown.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Username updated successfully.',
      type: UserResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Invalid username format or 30-day modification cooldown active',
         errorCodes: [COMMON_ERROR_CODES.VALIDATION_FAILED, USER_ERROR_CODES.USERNAME_CHANGE_COOLDOWN],
         exampleParams: { daysRemaining: 24, hoursRemaining: 5, nextAvailableDate: '2026-11-15T00:00:00.000Z' },
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'User profile not found',
         errorCodes: [USER_ERROR_CODES.USER_NOT_FOUND],
      },
      {
         status: HttpStatus.CONFLICT,
         description: 'New username is already taken by another user',
         errorCodes: [USER_ERROR_CODES.USERNAME_ALREADY_TAKEN],
         exampleParams: { username: 'new_username' },
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.UPDATE_USERNAME_SUCCESS)
   async updateMyUsername(@Body() dto: UpdateUsernameDto, @CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.updateUsername(user.sub, dto.username, user);
   }

   @Patch('me/display-name')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'updateMyDisplayName',
      summary: 'Update public display name',
      description: 'Updates the public profile display name for the authenticated user (2-50 characters).',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Display name updated successfully.',
      type: UserResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Validation failed for display name',
         errorCodes: [COMMON_ERROR_CODES.VALIDATION_FAILED],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'User profile not found',
         errorCodes: [USER_ERROR_CODES.USER_NOT_FOUND],
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.UPDATE_DISPLAY_NAME_SUCCESS)
   async updateMyDisplayName(@Body() dto: UpdateDisplayNameDto, @CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.updateDisplayName(user.sub, dto.displayName, user);
   }

   @Patch('me/bio')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'updateMyBio',
      summary: 'Update biography description',
      description: 'Updates the public bio for the authenticated user (maximum 500 characters).',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Biography updated successfully.',
      type: UserResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Validation failed for biography',
         errorCodes: [COMMON_ERROR_CODES.VALIDATION_FAILED],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'User profile not found',
         errorCodes: [USER_ERROR_CODES.USER_NOT_FOUND],
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.UPDATE_BIO_SUCCESS)
   async updateMyBio(@Body() dto: UpdateBioDto, @CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.updateBio(user.sub, dto.bio, user);
   }

   @Patch('me/personal-info')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'updateMyPersonalInfo',
      summary: 'Update personal demographic info (date of birth and gender)',
      description: 'Updates date of birth and gender together for the authenticated user.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Personal information updated successfully.',
      type: UserResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Validation failed for date of birth or gender',
         errorCodes: [COMMON_ERROR_CODES.VALIDATION_FAILED],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'User profile not found',
         errorCodes: [USER_ERROR_CODES.USER_NOT_FOUND],
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.UPDATE_PERSONAL_INFO_SUCCESS)
   async updateMyPersonalInfo(@Body() dto: UpdatePersonalInfoDto, @CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.updatePersonalInfo(user.sub, dto, user);
   }

   @Patch('me/location')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'updateMyLocation',
      summary: 'Update location address',
      description: 'Updates the location string for the authenticated user (maximum 100 characters).',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Location updated successfully.',
      type: UserResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Validation failed for location',
         errorCodes: [COMMON_ERROR_CODES.VALIDATION_FAILED],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'User profile not found',
         errorCodes: [USER_ERROR_CODES.USER_NOT_FOUND],
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.UPDATE_LOCATION_SUCCESS)
   async updateMyLocation(@Body() dto: UpdateLocationDto, @CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.updateLocation(user.sub, dto.location, user);
   }

   @Patch('me/website')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'updateMyWebsite',
      summary: 'Update personal or blog website URL',
      description: 'Updates the website URL for the authenticated user (valid URL up to 255 characters).',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Website URL updated successfully.',
      type: UserResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Validation failed for website URL',
         errorCodes: [COMMON_ERROR_CODES.VALIDATION_FAILED],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'User profile not found',
         errorCodes: [USER_ERROR_CODES.USER_NOT_FOUND],
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.UPDATE_WEBSITE_SUCCESS)
   async updateMyWebsite(@Body() dto: UpdateWebsiteDto, @CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.updateWebsite(user.sub, dto.website, user);
   }

   @Patch('me/cover-image')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'updateMyCoverImage',
      summary: 'Update profile cover banner image URL',
      description: 'Updates the cover banner image URL for the authenticated user.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Cover image updated successfully.',
      type: UserResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Validation failed for cover image URL',
         errorCodes: [COMMON_ERROR_CODES.VALIDATION_FAILED],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'User profile not found',
         errorCodes: [USER_ERROR_CODES.USER_NOT_FOUND],
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.UPDATE_COVER_IMAGE_SUCCESS)
   async updateMyCoverImage(@Body() dto: UpdateCoverImageDto, @CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.updateCoverImage(user.sub, dto.coverImage, user);
   }

   @Post('me/avatar')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'uploadMyAvatar',
      summary: 'Upload new avatar image directly to Cloudinary CDN',
   })
   @ApiConsumes('multipart/form-data')
   @ApiBody({
      schema: {
         type: 'object',
         properties: {
            file: {
               type: 'string',
               format: 'binary',
               description: 'Image file (JPEG, PNG, WebP, max 5MB)',
            },
         },
         required: ['file'],
      },
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Avatar uploaded and updated successfully.',
      type: UserAvatarUploadResponseDto,
      links: {
         GetMyProfile: {
            operationId: 'getMyUserProfile',
            description: 'Retrieve updated user profile with new avatar image',
         },
      },
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'File is missing or invalid image format (allowed: jpeg, png, webp, gif; max 5MB)',
         errorCodes: [USER_ERROR_CODES.FILE_REQUIRED, USER_ERROR_CODES.INVALID_FILE_TYPE],
         exampleParams: { allowed: 'image/jpeg, image/png, image/webp, image/gif' },
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'User profile not found',
         errorCodes: [USER_ERROR_CODES.USER_NOT_FOUND],
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.UPLOAD_AVATAR_SUCCESS)
   @UseInterceptors(
      FileInterceptor('file', {
         limits: { fileSize: 5 * 1024 * 1024 },
      }),
   )
   async uploadMyAvatar(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: JwtPayload): Promise<unknown> {
      if (!file || !file.buffer) {
         throw new BadRequestException(USER_ERROR_CODES.FILE_REQUIRED);
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedMimes.includes(file.mimetype)) {
         throw new BadRequestException(USER_ERROR_CODES.INVALID_FILE_TYPE, {
            params: { allowed: allowedMimes.join(', ') },
         });
      }

      const fileBase64 = file.buffer.toString('base64');
      return this.usersService.uploadAvatar(user.sub, fileBase64, file.mimetype, user);
   }

   @Get('me/avatar/signature')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'getMyAvatarSignature',
      summary: 'Get signed upload signature for direct client-to-Cloudinary upload',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Signed upload parameters generated successfully.',
      type: AvatarSignatureResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'User profile not found',
         errorCodes: [USER_ERROR_CODES.USER_NOT_FOUND],
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.GET_AVATAR_SIGNATURE_SUCCESS)
   async getMyAvatarSignature(@CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.getAvatarUploadSignature(user.sub, user);
   }

   @Get(':userId/date-of-birth')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'getUserDateOfBirthByUserId',
      summary: 'Get date of birth and age of a specific user by userId from User Service',
      description:
         'Retrieves the date of birth and calculates current age for the requested user account by userId in User Service.',
   })
   @ApiParam({
      name: 'userId',
      description: 'Account user identifier (UUIDv7 format, matching account id / JWT sub)',
      example: '018dc3bc-11a2-7f28-9842-bc08684d0001',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'User date of birth details returned successfully.',
      type: UserDateOfBirthResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Invalid userId format.',
         errorCodes: [COMMON_ERROR_CODES.INVALID_REQUEST],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Authentication token missing, invalid, or expired.',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'User profile not found in User Service.',
         errorCodes: [USER_ERROR_CODES.USER_NOT_FOUND],
         exampleParams: { userId: '018dc3bc-11a2-7f28-9842-bc08684d0001' },
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.GET_DATE_OF_BIRTH_SUCCESS)
   async getUserDateOfBirth(@Param('userId') userId: string): Promise<UserDateOfBirthResponseDto> {
      return this.usersService.getDateOfBirth(userId);
   }

   @Get(':id')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'getUserById',
      summary: 'Get user details by ID',
   })
   @ApiParam({ name: 'id', description: 'User UUID identifier', example: '550e8400-e29b-41d4-a716-446655440000' })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'User details returned successfully.',
      type: UserResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Invalid user ID format',
         errorCodes: [COMMON_ERROR_CODES.INVALID_REQUEST],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'User profile not found',
         errorCodes: [USER_ERROR_CODES.USER_NOT_FOUND],
         exampleParams: { id: '550e8400-e29b-41d4-a716-446655440000' },
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.GET_DETAIL_SUCCESS)
   async getUserById(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.getUserById(id, user);
   }
}
