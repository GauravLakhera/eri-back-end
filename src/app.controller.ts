import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from './common/guards/auth.guard';

@Controller()
export class AppController {
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('test-auth')
  @UseGuards(JwtAuthGuard)
  testAuth(@Request() req: any) {
    return {
      message: 'Authentication successful!',
      user: req.user,
      timestamp: new Date().toISOString(),
    };
  }
}