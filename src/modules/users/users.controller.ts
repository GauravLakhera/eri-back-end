import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.CLIENT_ADMIN)
  @ApiOperation({ summary: 'Create new user' })
  async create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    // If CLIENT_ADMIN, restrict to their client only
    if (user.role === UserRole.CLIENT_ADMIN) {
      createUserDto.clientId = user.clientId;
    }
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'List users' })
  async findAll(@CurrentUser() user: JwtPayload) {
    // Return users from current client only (unless SUPERADMIN)
    const clientId = user.role === UserRole.SUPERADMIN ? null : user.clientId;
    if (clientId) {
      return this.usersService.findAll(clientId);
    }
    return [];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}