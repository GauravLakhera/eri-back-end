import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    console.log('JwtAuthGuard - Checking authentication');
    console.log('Token present:', !!token);
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'none');
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    console.log('JwtAuthGuard - handleRequest');
    console.log('Error:', err);
    console.log('User:', user ? `${user.email} (${user.role})` : 'none');
    console.log('Info:', info);

    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}