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
   CreateUserProfileDto,
   CurrentUser,
   Public,
   ResponseMessage,
   UpdateUserDto,
   UserDateOfBirthResponseDto,
   USER_ERROR_CODES,
   USER_ERROR_REASONS,
   USER_RESPONSE_MESSAGES,
} from '@common';
import { UsersService } from '@/modules/users/users.service';
import type { JwtPayload } from '@common/utils/jwt.util';

@ApiTags('Users')
@Controller('users')
export class UsersController {
   constructor(private readonly usersService: UsersService) {}

   @Public()
   @Get('check-username')
   @ApiOperation({ summary: 'Check if a username is available using fast Bloom Filter' })
   @ApiQuery({ name: 'username', required: true, description: 'Username to verify availability', example: 'john_doe' })
   @ApiResponse({ status: 200, description: 'Username availability status returned.' })
   @ApiErrorResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Username query parameter is missing or has invalid format',
      errorCodes: [USER_ERROR_CODES.INVALID_USERNAME_FORMAT],
      exampleParams: { reason: USER_ERROR_REASONS.USERNAME_REQUIRED },
   })
   @ResponseMessage(USER_RESPONSE_MESSAGES.CHECK_USERNAME_SUCCESS)
   async checkUsername(@Query('username') username: string): Promise<{ available: boolean; username: string }> {
      if (!username || !username.trim()) {
         throw new BadRequestException(USER_ERROR_CODES.INVALID_USERNAME_FORMAT, {
            params: { reason: USER_ERROR_REASONS.USERNAME_REQUIRED },
         });
      }
      return this.usersService.checkUsername(username);
   }

   @Public()
   @Get('search')
   @ApiOperation({ summary: 'Search users by name or username using Elasticsearch' })
   @ApiQuery({ name: 'q', required: true, description: 'Search keyword', example: 'alex' })
   @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
   @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
   @ApiResponse({ status: 200, description: 'Matching users returned successfully.' })
   @ApiErrorResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid pagination or search query parameters',
      errorCodes: [COMMON_ERROR_CODES.INVALID_REQUEST, COMMON_ERROR_CODES.VALIDATION_FAILED],
   })
   @ResponseMessage(USER_RESPONSE_MESSAGES.SEARCH_SUCCESS)
   async searchUsers(
      @Query('q') query: string,
      @Query('page') page = '1',
      @Query('limit') limit = '10',
   ): Promise<unknown> {
      return this.usersService.searchUsers(query || '', Number(limit), Number(page));
   }

   @Post('profile')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'createUserProfile',
      summary: 'Create initial user profile for the current authenticated user',
   })
   @ApiResponse({
      status: 201,
      description: 'User profile created successfully.',
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
   @ApiOperation({ summary: 'Get list of users' })
   @ApiQuery({ name: 'page', required: false, type: Number })
   @ApiQuery({ name: 'limit', required: false, type: Number })
   @ApiResponse({ status: 200, description: 'List of users returned.' })
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
   @ApiResponse({ status: 200, description: 'Current user profile returned successfully' })
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

   @Patch('me')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      summary: 'Update current authenticated user profile (displayName, username, gender, dateOfBirth, bio, etc.)',
   })
   @ApiResponse({ status: 200, description: 'User profile updated successfully.' })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Validation failed for updated fields',
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
      {
         status: HttpStatus.CONFLICT,
         description: 'New username is already taken by another user',
         errorCodes: [USER_ERROR_CODES.USERNAME_ALREADY_TAKEN],
         exampleParams: { username: 'new_username' },
      },
   ])
   @ResponseMessage(USER_RESPONSE_MESSAGES.UPDATE_PROFILE_SUCCESS)
   async updateMyProfile(@Body() updateUserDto: UpdateUserDto, @CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.updateMyProfile(updateUserDto, user);
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
      status: 200,
      description: 'Avatar uploaded and updated successfully.',
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
   @ApiOperation({ summary: 'Get signed upload signature for direct client-to-Cloudinary upload' })
   @ApiResponse({ status: 200, description: 'Signed upload parameters generated successfully.' })
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
   @ApiOperation({ summary: 'Get user details by ID' })
   @ApiParam({ name: 'id', description: 'User UUID identifier', example: '550e8400-e29b-41d4-a716-446655440000' })
   @ApiResponse({ status: 200, description: 'User details returned.' })
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

   @Patch(':id')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({ summary: 'Update user profile by ID' })
   @ApiParam({ name: 'id', description: 'User UUID identifier', example: '550e8400-e29b-41d4-a716-446655440000' })
   @ApiResponse({ status: 200, description: 'User updated successfully.' })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Validation failed or invalid user ID',
         errorCodes: [COMMON_ERROR_CODES.VALIDATION_FAILED, COMMON_ERROR_CODES.INVALID_REQUEST],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.FORBIDDEN,
         description: 'Forbidden if the user is not the owner or administrator',
         errorCodes: [COMMON_ERROR_CODES.FORBIDDEN, COMMON_ERROR_CODES.NOT_OWNER_OR_ADMIN],
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
   @ResponseMessage(USER_RESPONSE_MESSAGES.UPDATE_SUCCESS)
   async updateUser(
      @Param('id') id: string,
      @Body() updateUserDto: UpdateUserDto,
      @CurrentUser() user: JwtPayload,
   ): Promise<unknown> {
      return this.usersService.updateUser(id, updateUserDto, user);
   }
}
