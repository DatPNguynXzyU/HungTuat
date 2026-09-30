import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ResponseMessage, UpdateUserDto, CurrentUser } from '@common';
import { UsersService } from '@/modules/users/users.service';
import type { JwtPayload } from '@common/utils/jwt.util';

@ApiTags('Users')
@Controller('users')
@ApiCookieAuth()
export class UsersController {
   constructor(private readonly usersService: UsersService) {}

   @Get()
   @ApiOperation({ summary: 'Get list of users' })
   @ApiQuery({ name: 'page', required: false, type: Number })
   @ApiQuery({ name: 'limit', required: false, type: Number })
   @ApiResponse({ status: 200, description: 'List of users returned.' })
   @ResponseMessage('USERS.GET_LIST_SUCCESS')
   async getAllUsers(
      @Query('page') page = '1',
      @Query('limit') limit = '10',
      @CurrentUser() user: JwtPayload,
   ): Promise<unknown> {
      return this.usersService.getAllUsers(Number(page), Number(limit), user);
   }

   @Get(':id')
   @ApiOperation({ summary: 'Get user details by ID' })
   @ApiResponse({ status: 200, description: 'User details returned.' })
   @ResponseMessage('USERS.GET_DETAIL_SUCCESS')
   async getUserById(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<unknown> {
      return this.usersService.getUserById(id, user);
   }

   @Patch(':id')
   @ApiOperation({ summary: 'Update user by ID' })
   @ApiResponse({ status: 200, description: 'User updated successfully.' })
   @ResponseMessage('USERS.UPDATE_SUCCESS')
   async updateUser(
      @Param('id') id: string,
      @Body() updateUserDto: UpdateUserDto,
      @CurrentUser() user: JwtPayload,
   ): Promise<unknown> {
      return this.usersService.updateUser(id, updateUserDto, user);
   }
}
