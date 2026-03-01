import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { UserNotification } from './entities/user-notification.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(UserNotification) private notificationsRepository: Repository<UserNotification>,
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

  // ── Admin methods ────────────────────────────────────────────────────────────

  async findAllAdmin(filters: {
    search?: string;
    type?: string;
    plan?: string;
    page?: number;
    limit?: number;
  }) {
    const page  = Math.max(1, filters.page  ?? 1);
    const limit = Math.min(50, filters.limit ?? 20);

    const query = this.usersRepository.createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');

    if (filters.search) {
      query.andWhere(
        '(LOWER(user.name) LIKE :q OR LOWER(user.email) LIKE :q)',
        { q: `%${filters.search.toLowerCase()}%` },
      );
    }
    if (filters.type && filters.type !== 'all') {
      query.andWhere('user.userType = :type', { type: filters.type });
    }
    if (filters.plan && filters.plan !== 'all') {
      query.andWhere('LOWER(user.subscriptionPlan) = :plan', { plan: filters.plan.toLowerCase() });
    }

    const [users, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Fetch listings count per user via raw query (avoids circular dependency)
    const ids = users.map(u => u.id);
    let countMap: Record<string, number> = {};
    if (ids.length > 0) {
      const rows: { userId: string; count: string }[] = await this.usersRepository.query(
        `SELECT "userId", COUNT(*)::int AS count FROM vehicles WHERE "userId" = ANY($1) GROUP BY "userId"`,
        [ids],
      );
      rows.forEach(r => { countMap[r.userId] = Number(r.count); });
    }

    const data = users.map(u => {
      const { password, ...safe } = u as any;
      return { ...safe, listingsCount: countMap[u.id] ?? 0 };
    });

    return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async setActive(id: string, isActive: boolean) {
    await this.usersRepository.update(id, { isActive });
    return this.findById(id);
  }

  async deleteById(id: string) {
    const user = await this.findById(id); // throws if not found
    await this.usersRepository.remove(user);
    return { success: true };
  }

  async banUser(id: string, reason: string, bannedUntil: Date | null) {
    await this.usersRepository.update(id, {
      isBanned: true,
      banReason: reason,
      bannedUntil,
      bannedAt: new Date(),
    } as any);
    return this.findById(id);
  }

  async unbanUser(id: string) {
    await this.usersRepository.update(id, {
      isBanned: false,
      banReason: null,
      bannedUntil: null,
      bannedAt: null,
    } as any);
    return this.findById(id);
  }

  async notifyUser(
    userId: string,
    types: string[],
    subject: string,
    message: string,
  ) {
    const user = await this.findById(userId);
    const sent: string[] = [];

    for (const type of types) {
      if (type === 'email') {
        // Production: plug in nodemailer / SendGrid / SES here
        console.log(`[EMAIL NOTIFICATION] → ${user.email}`);
        console.log(`  Subject : ${subject}`);
        console.log(`  Message : ${message}`);
        sent.push('email');
      } else if (type === 'sms') {
        const phone = user.phone || user.storePhone1 || null;
        // Production: plug in Twilio / AWS SNS here
        console.log(`[SMS NOTIFICATION] → ${phone ?? 'no phone on file'}`);
        console.log(`  Message : ${message}`);
        sent.push('sms');
      } else if (type === 'notification') {
        await this.notificationsRepository.save(
          this.notificationsRepository.create({ userId, type: 'notification', subject, message }),
        );
        sent.push('notification');
      }
    }

    return { sent };
  }

  async seed() {
    // Seed regular test user (only if no users exist)
    const count = await this.usersRepository.count();
    if (count === 0) {
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

    // Always ensure admin user exists
    const adminExists = await this.usersRepository.findOne({ where: { email: 'admin@karoussa.com' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = this.usersRepository.create({
        email: 'admin@karoussa.com',
        password: hashedPassword,
        name: 'Admin',
        firstName: 'Admin',
        lastName: 'Karoussa',
        subscriptionPlan: 'free',
        isAdmin: true,
        notifyNewListings: true,
        notifySavedSearches: true,
        notifyMessages: true,
        notifyNewsletter: false,
      });
      await this.usersRepository.save(admin);
      console.log('✅ Admin user seeded: admin@karoussa.com / admin123');
    }
  }
}
