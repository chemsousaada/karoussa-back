import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerData: {
    email: string;
    password: string;
    name?: string;
    firstName?: string;
    lastName?: string;
  }) {
    const user = await this.usersService.create(registerData);
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    const { password, ...safeUser } = user as any;
    return { user: safeUser, token };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check ban status
    if (user.isBanned) {
      const now = new Date();
      const isLifetime = user.bannedUntil === null || user.bannedUntil === undefined;
      const isExpired = !isLifetime && new Date(user.bannedUntil) <= now;

      if (isExpired) {
        // Auto-unban: ban period has elapsed
        await this.usersService.update(user.id, {
          isBanned: false,
          banReason: null,
          bannedUntil: null,
          bannedAt: null,
        } as any);
      } else {
        throw new HttpException(
          {
            isBanned: true,
            isLifetime,
            banReason: user.banReason || 'No reason provided',
            bannedUntil: user.bannedUntil ? new Date(user.bannedUntil).toISOString() : null,
            bannedAt: user.bannedAt ? new Date(user.bannedAt).toISOString() : null,
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    const { password, ...safeUser } = user as any;
    return { user: safeUser, token };
  }

  async logout() {
    return { message: 'Logged out successfully' };
  }
}
