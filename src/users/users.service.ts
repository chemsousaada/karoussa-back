import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { UserNotification } from './entities/user-notification.entity';
import { ScheduledNotification } from './entities/scheduled-notification.entity';
import { SubscriptionRequest } from './entities/subscription-request.entity';
import { AdminInquiry, SelectedAdvert } from './entities/admin-inquiry.entity';
import { InquiryMessage } from './entities/inquiry-message.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(UserNotification) private notificationsRepository: Repository<UserNotification>,
    @InjectRepository(ScheduledNotification) private scheduledNotifRepository: Repository<ScheduledNotification>,
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

  async findAllRentalAgencies() {
    return this.usersRepository.find({ where: { userType: 'rental_agency' } });
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
    link?: string,
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
          this.notificationsRepository.create({ userId, type: 'notification', subject, message, link: link ?? null }),
        );
        sent.push('notification');
      }
    }

    return { sent };
  }

  /** Create a notification directly (internal use - skips email/sms) */
  async createNotification(userId: string, subject: string, message: string, link?: string) {
    return this.notificationsRepository.save(
      this.notificationsRepository.create({ userId, type: 'notification', subject, message, link: link ?? null }),
    );
  }

  /** Broadcast a notification to all users or a specific list. Supports scheduling. */
  async broadcastNotification(data: {
    targetType: 'all' | 'specific';
    userIds?: string[];
    subject: string;
    message: string;
    link?: string;
    notifType?: string;
    scheduledFor?: Date;
  }) {
    const scheduledFor = data.scheduledFor ?? new Date();
    const isImmediate = scheduledFor <= new Date();

    if (isImmediate) {
      let userIds = data.userIds ?? [];
      if (data.targetType === 'all') {
        const users = await this.usersRepository.find({ select: ['id'] });
        userIds = users.map(u => u.id);
      }
      const notifs = userIds.map(uid =>
        this.notificationsRepository.create({
          userId: uid,
          type: 'notification',
          subject: data.subject,
          message: data.message,
          link: data.link ?? null,
        }),
      );
      if (notifs.length > 0) await this.notificationsRepository.save(notifs);
      return { sent: notifs.length, scheduled: false };
    }

    // Store for later processing by cron
    const scheduled = await this.scheduledNotifRepository.save(
      this.scheduledNotifRepository.create({
        userIds: data.targetType === 'all' ? null : (data.userIds ?? []),
        subject: data.subject,
        message: data.message,
        link: data.link ?? null,
        notifType: data.notifType ?? null,
        scheduledFor,
        status: 'pending',
      }),
    );
    return { sent: 0, scheduled: true, id: scheduled.id };
  }

  /** Process pending scheduled notifications (called by cron). */
  async processPendingScheduled() {
    const pending = await this.scheduledNotifRepository.find({
      where: { status: 'pending' },
    });
    const now = new Date();
    for (const sn of pending) {
      if (sn.scheduledFor > now) continue;

      let userIds = sn.userIds ?? [];
      if (sn.userIds === null) {
        const users = await this.usersRepository.find({ select: ['id'] });
        userIds = users.map(u => u.id);
      }
      const notifs = userIds.map(uid =>
        this.notificationsRepository.create({
          userId: uid,
          type: 'notification',
          subject: sn.subject,
          message: sn.message,
          link: sn.link ?? null,
        }),
      );
      if (notifs.length > 0) await this.notificationsRepository.save(notifs);
      await this.scheduledNotifRepository.update(sn.id, { status: 'sent' });
    }
  }

  /** List scheduled notifications (admin view). */
  async listScheduledNotifications(page = 1, limit = 20) {
    const [data, total] = await this.scheduledNotifRepository.findAndCount({
      order: { scheduledFor: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
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
      const note = options.adminNote ?? '';
      const fallback = note
        ? `Your ${planLabel} subscription has been approved for ${finalDuration} month(s). ${note}`
        : `Your ${planLabel} subscription has been approved and is now active for ${finalDuration} month(s).`;
      const msg = JSON.stringify({ key: 'notif_sub_approved', params: { plan: planLabel, duration: String(finalDuration), note }, text: fallback });
      await this.notifyUser(request.userId, notifyMethods, 'notif_sub_approved_subject', msg, '/account/subscriptions');
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
      const note = options.adminNote ?? '';
      const fallback = note
        ? `Your subscription request for the ${planLabel} plan was not approved. Reason: ${note}`
        : `Your subscription request for the ${planLabel} plan was not approved at this time.`;
      const msg = JSON.stringify({ key: 'notif_sub_denied', params: { plan: planLabel, note }, text: fallback });
      await this.notifyUser(request.userId, notifyMethods, 'notif_sub_denied_subject', msg, '/account/subscriptions');
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
    // Notify the user about the new admin reply (Step 3)
    const snippet = `${content.slice(0, 80)}${content.length > 80 ? '…' : ''}`;
    await this.createNotification(
      inquiry.userId,
      'notif_support_reply_subject',
      JSON.stringify({ key: 'notif_support_reply', params: { snippet }, text: `Support has replied to your inquiry. "${snippet}"` }),
      `/account/support`,
    ).catch(() => {});
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

  // ── Notifications (user-facing) ───────────────────────────────────────────

  async getUserNotifications(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;
    const [data, total] = await this.notificationsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getUnreadNotificationCount(userId: string) {
    const count = await this.notificationsRepository.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markNotificationRead(userId: string, id: string) {
    await this.notificationsRepository.update({ id, userId }, { isRead: true });
    return { success: true };
  }

  async markAllNotificationsRead(userId: string) {
    await this.notificationsRepository.update({ userId, isRead: false }, { isRead: true });
    return { success: true };
  }

  async deleteNotification(userId: string, id: string) {
    await this.notificationsRepository.delete({ id, userId });
    return { success: true };
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
      const saved = await this.usersRepository.save(user);
      console.log('✅ Test user seeded: test@example.com / password123');

      // Seed demo notifications for the test user
      const demoNotifs = [
        { subject: 'Welcome to Autotrader!', message: 'Your account is ready. Start by creating your first advert or browsing thousands of vehicles.', isRead: true },
        { subject: 'Subscription Plan Updated', message: 'Your subscription request for the Premium plan has been approved. Your plan is now active for 30 days.', isRead: true },
        { subject: 'New message received', message: 'You have a new message from a buyer regarding your BMW 3 Series listing. Tap to view the conversation.', isRead: false },
        { subject: 'Your advert is live', message: 'Your advert for the 2021 Volkswagen Golf has been published and is now visible to buyers.', isRead: false },
        { subject: 'Price drop alert', message: 'A vehicle on your saved list (Audi A4) has dropped in price by £1,500. Check it out before it sells!', isRead: false },
      ];
      for (const n of demoNotifs) {
        await this.notificationsRepository.save(
          this.notificationsRepository.create({ userId: saved.id, type: 'notification', ...n }),
        );
      }
      console.log('✅ Demo notifications seeded');
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
