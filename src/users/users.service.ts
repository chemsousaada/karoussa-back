import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
  ) {}

  async create(registerData: {
    email: string;
    password: string;
    name?: string;
    firstName?: string;
    lastName?: string;
  }) {
    const existing = await this.usersRepository.findOne({
      where: { email: registerData.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerData.password, 10);
    const name =
      registerData.name ||
      [registerData.firstName, registerData.lastName].filter(Boolean).join(' ') ||
      registerData.email.split('@')[0];

    const user = this.usersRepository.create({
      email: registerData.email,
      password: hashedPassword,
      name,
      subscriptionPlan: 'free',
    });

    return this.usersRepository.save(user);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, updateData: Partial<User>) {
    await this.usersRepository.update(id, updateData);
    return this.findById(id);
  }

  async getCurrentUser(userId: string) {
    return this.findById(userId);
  }

  async seed() {
    const count = await this.usersRepository.count();
    if (count > 0) return;

    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = this.usersRepository.create({
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
      subscriptionPlan: 'free',
      notifyNewListings: true,
      notifySavedSearches: true,
      notifyMessages: true,
      notifyNewsletter: false,
    });
    await this.usersRepository.save(user);
    console.log('✅ Test user seeded: test@example.com / password123');
  }
}
