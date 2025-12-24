import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
    });

    console.log('JWT Strategy initialized with secret:', 
      (configService.get<string>('JWT_SECRET') || 'default-secret').substring(0, 10) + '...'
    );
  }

  async validate(payload: any) {
    console.log('JWT Strategy validate called with payload:', payload);

    // Validate user still exists and is active
    const user = await this.authService.validateUser(payload.userId);
    
    if (!user) {
      console.log('JWT validation failed: user not found or inactive');
      throw new UnauthorizedException('User not found or inactive');
    }

    console.log('JWT validation successful for user:', user.email);
    return user;
  }
}