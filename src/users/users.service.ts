import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { UserNotification } from './entities/user-notification.entity';
import { SubscriptionRequest } from './entities/subscription-request.entity';
import { AdminInquiry, SelectedAdvert } from './entities/admin-inquiry.entity';
import { InquiryMessage } from './entities/inquiry-message.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(UserNotification) private notificationsRepository: Repository<UserNotification>,
    @InjectRepository(SubscriptionRequest) private subRequestsRepository: Repository<SubscriptionRequest>,
    @InjectRepository(AdminInquiry) private inquiriesRepository: Repository<AdminInquiry>,
    @InjectRepository(InquiryMessage) private inquiryMessagesRepository: Repository<InquiryMessage>,
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

  // ── Subscription requests ─────────────────────────────────────────────────

  async createSubscriptionRequest(userId: string, data: {
    requestedPlan: string;
    duration: number;
    price: number;
    promoCode?: string;
    discountPct?: number;
    paymentMethod: string;
  }) {
    const user = await this.findById(userId);
    const request = this.subRequestsRepository.create({
      userId,
      userName: user.name,
      userEmail: user.email,
      currentPlan: user.subscriptionPlan || 'free',
      requestedPlan: data.requestedPlan,
      duration: data.duration,
      price: data.price,
      promoCode: data.promoCode ?? null,
      discountPct: data.discountPct ?? 0,
      paymentMethod: data.paymentMethod,
      status: 'pending',
    });
    return this.subRequestsRepository.save(request);
  }

  async getMySubscriptionRequests(userId: string) {
    return this.subRequestsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllSubscriptionRequests(filters: { status?: string; page?: number; limit?: number }) {
    const page  = Math.max(1, filters.page  ?? 1);
    const limit = Math.min(50, filters.limit ?? 20);
    const query = this.subRequestsRepository.createQueryBuilder('req')
      .orderBy('req.createdAt', 'DESC');
    if (filters.status && filters.status !== 'all') {
      query.andWhere('req.status = :status', { status: filters.status });
    }
    const [data, total] = await query.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async acceptSubscriptionRequest(requestId: string, options: {
    duration?: number;
    notifyMethods?: string[];
    adminNote?: string;
  }) {
    const request = await this.subRequestsRepository.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Subscription request not found');

    const finalDuration = options.duration ?? request.duration;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + finalDuration);

    await this.usersRepository.update(request.userId, {
      subscriptionPlan: request.requestedPlan,
      subscriptionExpiresAt: expiresAt.toISOString().split('T')[0],
    });

    const notifyMethods = options.notifyMethods ?? [];
    await this.subRequestsRepository.update(requestId, {
      status: 'accepted',
      adjustedDuration: finalDuration,
      notifyMethod: notifyMethods.join(',') || null,
      adminNote: options.adminNote ?? null,
    });

    if (notifyMethods.length > 0) {
      const planLabel = request.requestedPlan.charAt(0).toUpperCase() + request.requestedPlan.slice(1).replace('_', ' ');
      const msg = options.adminNote
        ? `Your ${planLabel} subscription has been approved for ${finalDuration} month(s). ${options.adminNote}`
        : `Your ${planLabel} subscription has been approved and is now active for ${finalDuration} month(s).`;
      await this.notifyUser(request.userId, notifyMethods, 'Subscription Approved ✓', msg);
    }

    return this.subRequestsRepository.findOne({ where: { id: requestId } });
  }

  async denySubscriptionRequest(requestId: string, options: {
    notifyMethods?: string[];
    adminNote?: string;
  }) {
    const request = await this.subRequestsRepository.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Subscription request not found');

    const notifyMethods = options.notifyMethods ?? [];
    await this.subRequestsRepository.update(requestId, {
      status: 'denied',
      notifyMethod: notifyMethods.join(',') || null,
      adminNote: options.adminNote ?? null,
    });

    if (notifyMethods.length > 0) {
      const planLabel = request.requestedPlan.charAt(0).toUpperCase() + request.requestedPlan.slice(1).replace('_', ' ');
      const msg = options.adminNote
        ? `Your subscription request for the ${planLabel} plan has been denied. Reason: ${options.adminNote}`
        : `Your subscription request for the ${planLabel} plan was not approved at this time.`;
      await this.notifyUser(request.userId, notifyMethods, 'Subscription Request Update', msg);
    }

    return this.subRequestsRepository.findOne({ where: { id: requestId } });
  }

  // ── Admin Inquiries ───────────────────────────────────────────────────────

  async createInquiry(userId: string, data: {
    requestedPlan: string;
    selectedAdverts: SelectedAdvert[];
    message: string;
  }) {
    const user = await this.findById(userId);
    const inquiry = this.inquiriesRepository.create({
      userId,
      userName: user.name,
      userEmail: user.email,
      requestedPlan: data.requestedPlan,
      selectedAdverts: data.selectedAdverts,
      message: data.message,
      status: 'pending',
    });
    const saved = await this.inquiriesRepository.save(inquiry);
    // Auto-create the initial user message in the chat thread
    await this.inquiryMessagesRepository.save(
      this.inquiryMessagesRepository.create({
        inquiryId: saved.id,
        senderType: 'user',
        content: data.message,
      }),
    );
    return saved;
  }

  async getMyInquiries(userId: string) {
    return this.inquiriesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getInquiryMessages(userId: string, inquiryId: string) {
    const inquiry = await this.inquiriesRepository.findOne({ where: { id: inquiryId } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    if (inquiry.userId !== userId) throw new ForbiddenException('Access denied');
    return this.inquiryMessagesRepository.find({
      where: { inquiryId },
      order: { createdAt: 'ASC' },
    });
  }

  async addUserMessage(userId: string, inquiryId: string, content: string) {
    const inquiry = await this.inquiriesRepository.findOne({ where: { id: inquiryId } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    if (inquiry.userId !== userId) throw new ForbiddenException('Access denied');
    if (inquiry.status === 'resolved') throw new ForbiddenException('This conversation is resolved and closed');
    return this.inquiryMessagesRepository.save(
      this.inquiryMessagesRepository.create({ inquiryId, senderType: 'user', content }),
    );
  }

  async adminListInquiries(filters: { status?: string; page?: number; limit?: number }) {
    const page  = Math.max(1, filters.page  ?? 1);
    const limit = Math.min(50, filters.limit ?? 20);
    const query = this.inquiriesRepository.createQueryBuilder('inq')
      .orderBy('inq.updatedAt', 'DESC');
    if (filters.status && filters.status !== 'all') {
      query.andWhere('inq.status = :status', { status: filters.status });
    }
    const [data, total] = await query.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async adminGetInquiryMessages(inquiryId: string) {
    const inquiry = await this.inquiriesRepository.findOne({ where: { id: inquiryId } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return this.inquiryMessagesRepository.find({
      where: { inquiryId },
      order: { createdAt: 'ASC' },
    });
  }

  async adminReplyToInquiry(inquiryId: string, content: string) {
    const inquiry = await this.inquiriesRepository.findOne({ where: { id: inquiryId } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    if (inquiry.status === 'resolved') throw new ForbiddenException('Inquiry is resolved');
    // Open the chat if it was still pending
    if (inquiry.status === 'pending') {
      await this.inquiriesRepository.update(inquiryId, { status: 'open' });
    }
    const msg = await this.inquiryMessagesRepository.save(
      this.inquiryMessagesRepository.create({ inquiryId, senderType: 'admin', content }),
    );
    return { message: msg, inquiry: await this.inquiriesRepository.findOne({ where: { id: inquiryId } }) };
  }

  async adminResolveInquiry(inquiryId: string) {
    await this.inquiriesRepository.update(inquiryId, { status: 'resolved' });
    return this.inquiriesRepository.findOne({ where: { id: inquiryId } });
  }

  async adminReopenInquiry(inquiryId: string) {
    await this.inquiriesRepository.update(inquiryId, { status: 'open' });
    return this.inquiriesRepository.findOne({ where: { id: inquiryId } });
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
