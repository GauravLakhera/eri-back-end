import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  async login(@Body() loginDto: LoginDto) {
    console.log('Login request received for:', loginDto.email);
    const result = await this.authService.login(loginDto);
    console.log('Login response prepared');
    
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  async getCurrentUser(@CurrentUser() user: JwtPayload) {
    console.log('Get current user request for:', user.email);
    return {
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: JwtPayload) {
    console.log('Logout request from:', user.email);
    return {
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    };
  }
}