import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
   BadRequestException,
   CreateUserProfileDto,
   CurrentUser,
   Public,
   ResponseMessage,
   UpdateUserDto,
   USER_ERROR_CODES,
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
   @ResponseMessage(USER_RESPONSE_MESSAGES.CHECK_USERNAME_SUCCESS)
   async checkUsername(@Query('username') username: string): Promise<{ available: boolean; username: string }> {
      if (!username || !username.trim()) {
         throw new BadRequestException(USER_ERROR_CODES.INVALID_USERNAME_FORMAT, {
            params: { reason: 'username_required' },
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
   @ApiOperation({ summary: 'Create initial user profile for the current authenticated user' })
   @ApiResponse({ status: 201, description: 'User profile created successfully.' })
   @ApiResponse({ status: 409, description: 'Profile already exists or username already taken.' })
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
      summary: 'Get current authenticated user profile, statistics, and settings',
   })
   @ApiResponse({ status: 200, description: 'Current user profile returned successfully' })
   @ApiResponse({ status: 401, description: 'Unauthorized if authentication is missing or invalid' })
   @ResponseMessage(USER_RESPONSE_MESSAGES.GET_PROFILE_SUCCESS)
   async getMyProfile(@CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.getMyProfile(user);
   }

   @Patch('me')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      summary: 'Update current authenticated user profile (displayName, username, gender, dateOfBirth, bio, etc.)',
   })
   @ApiResponse({ status: 200, description: 'User profile updated successfully.' })
   @ResponseMessage(USER_RESPONSE_MESSAGES.UPDATE_PROFILE_SUCCESS)
   async updateMyProfile(@Body() updateUserDto: UpdateUserDto, @CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.updateMyProfile(updateUserDto, user);
   }

   @Get(':id')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({ summary: 'Get user details by ID' })
   @ApiResponse({ status: 200, description: 'User details returned.' })
   @ResponseMessage(USER_RESPONSE_MESSAGES.GET_DETAIL_SUCCESS)
   async getUserById(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.getUserById(id, user);
   }

   @Patch(':id')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({ summary: 'Update user profile by ID' })
   @ApiResponse({ status: 200, description: 'User updated successfully.' })
   @ResponseMessage(USER_RESPONSE_MESSAGES.UPDATE_SUCCESS)
   async updateUser(
      @Param('id') id: string,
      @Body() updateUserDto: UpdateUserDto,
      @CurrentUser() user: JwtPayload,
   ): Promise<unknown> {
      return this.usersService.updateUser(id, updateUserDto, user);
   }
}
