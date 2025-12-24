import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/schemas/user.schema';
import { Client } from '../clients/schemas/client.schema';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Client.name) private clientModel: Model<Client>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user with populated client
    const user = await this.userModel
      .findOne({ email, isActive: true })
      .populate('clientId')
      .exec();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if client is active
    const client = await this.clientModel.findById(user.clientId);
    if (!client || !client.isActive) {
      throw new UnauthorizedException('Client account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token with longer expiry
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      clientId: client._id.toString(),
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: '7d', // 7 days instead of default
    });

    console.log('Login successful for:', email);
    console.log('Generated token:', token.substring(0, 20) + '...');
    console.log('Token payload:', payload);

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        clientId: client._id.toString(),
        clientName: client.name,
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate('clientId')
      .exec();

    if (!user || !user.isActive) {
      return null;
    }

    const client = await this.clientModel.findById(user.clientId);
    if (!client || !client.isActive) {
      return null;
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      clientId: client._id.toString(),
    };
  }
}