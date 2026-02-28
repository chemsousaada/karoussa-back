import {
  Injectable, NotFoundException, ForbiddenException,
  ConflictException, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Report } from './entities/report.entity';
import { User } from '../users/entities/user.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';

@Injectable()
export class ConversationsService implements OnModuleInit {
  constructor(
    @InjectRepository(Conversation) private convRepo: Repository<Conversation>,
    @InjectRepository(Message) private msgRepo: Repository<Message>,
    @InjectRepository(Report) private reportRepo: Repository<Report>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Vehicle) private vehicleRepo: Repository<Vehicle>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  // ── List conversations for a user ──────────────────────────────────────────

  async getConversations(userId: string) {
    const convs = await this.convRepo.find({
      where: { userId },
      relations: ['messages', 'reports'],
      order: { updatedAt: 'DESC' },
    });
    return convs.map(c => this.formatConversation(c, userId));
  }

  // ── Get single conversation ────────────────────────────────────────────────

  async getConversation(id: string, userId: string) {
    const conv = await this.convRepo.findOne({
      where: { id },
      relations: ['messages', 'reports'],
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== userId) throw new ForbiddenException('Access denied');
    return this.formatConversation(conv, userId);
  }

  // ── Create or find existing conversation ──────────────────────────────────

  async createOrFind(
    userId: string,
    vehicleId: string,
    sellerId: string,
    sellerName: string,
    vehicleTitle: string,
    vehicleImage: string,
  ) {
    let conv = await this.convRepo.findOne({ where: { userId, vehicleId } });
    if (!conv) {
      conv = this.convRepo.create({
        userId, vehicleId, sellerId, sellerName, vehicleTitle, vehicleImage,
      });
      await this.convRepo.save(conv);
    }
    return conv;
  }

  // ── Send message ───────────────────────────────────────────────────────────

  async sendMessage(
    conversationId: string,
    senderId: string,
    text: string,
    attachments: { type: string; url: string; name: string }[],
  ) {
    const conv = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== senderId) throw new ForbiddenException('Access denied');

    const msg = this.msgRepo.create({
      conversationId,
      senderId,
      text: text || null,
      attachments: attachments?.length ? (attachments as any) : null,
    });
    const saved = await this.msgRepo.save(msg);
    await this.convRepo.update(conversationId, { updatedAt: new Date() });
    return saved;
  }

  // ── Mark all received messages as read ────────────────────────────────────

  async markAsRead(conversationId: string, userId: string) {
    await this.msgRepo
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where(
        'conversationId = :conversationId AND senderId != :userId AND isRead = false',
        { conversationId, userId },
      )
      .execute();
    return { success: true };
  }

  // ── Unread count across all conversations ─────────────────────────────────

  async getUnreadCount(userId: string) {
    const convs = await this.convRepo.find({ where: { userId }, select: ['id'] });
    if (!convs.length) return { count: 0 };
    const ids = convs.map(c => c.id);
    const count = await this.msgRepo
      .createQueryBuilder('msg')
      .where('msg.conversationId IN (:...ids)', { ids })
      .andWhere('msg.senderId != :userId', { userId })
      .andWhere('msg.isRead = false')
      .getCount();
    return { count };
  }

  // ── Report a conversation ─────────────────────────────────────────────────

  async createReport(
    conversationId: string,
    reporterId: string,
    reason: string,
    details: string,
  ) {
    const conv = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== reporterId) throw new ForbiddenException('Access denied');

    const existing = await this.reportRepo.findOne({
      where: { conversationId, reporterId },
    });
    if (existing) throw new ConflictException('You have already reported this conversation');

    const report = this.reportRepo.create({ conversationId, reporterId, reason, details });
    await this.reportRepo.save(report);
    return { success: true };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private formatConversation(conv: Conversation, userId: string) {
    const messages = (conv.messages ?? [])
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const lastMsg = messages[messages.length - 1] ?? null;
    const unreadCount = messages.filter(m => m.senderId !== userId && !m.isRead).length;
    const hasReported = (conv.reports ?? []).some(r => r.reporterId === userId);

    return {
      id: conv.id,
      userId: conv.userId,
      sellerId: conv.sellerId,
      sellerName: conv.sellerName ?? 'Seller',
      vehicleId: conv.vehicleId,
      vehicleTitle: conv.vehicleTitle,
      vehicleImage: conv.vehicleImage ?? null,
      unreadCount,
      hasReported,
      lastMessage: lastMsg
        ? { text: lastMsg.text, senderId: lastMsg.senderId, createdAt: lastMsg.createdAt }
        : null,
      messages: messages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        text: m.text,
        attachments: m.attachments ?? [],
        isRead: m.isRead,
        createdAt: m.createdAt,
      })),
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  }

  // ── Seed ──────────────────────────────────────────────────────────────────

  async seed() {
    const count = await this.convRepo.count();
    if (count > 0) return;

    const testUser = await this.userRepo.findOne({ where: { email: 'test@example.com' } });
    if (!testUser) return;

    const vehicles = await this.vehicleRepo.find({ take: 5 });
    if (!vehicles.length) return;

    const now = Date.now();
    const day = 86_400_000;

    const seedData = [
      {
        vehicle: vehicles[0],
        unread: 2,
        messages: [
          { fromSeller: false, text: "Hi! Is this vehicle still available?", daysAgo: 6, read: true },
          { fromSeller: true, text: "Yes, still available. Would you like to arrange a viewing?", daysAgo: 5, read: true },
          { fromSeller: false, text: "That would be great. What's the lowest price you'd accept?", daysAgo: 4, read: true },
          { fromSeller: true, text: "I could go to £33,500 if you're serious about it.", daysAgo: 3, read: true },
          { fromSeller: false, text: "Let me think about it and get back to you.", daysAgo: 2, read: true },
          { fromSeller: true, text: "Of course, take your time. Let me know if you need more photos.", daysAgo: 1, read: false },
          { fromSeller: true, text: "Also happy to do a video call if you can't come in person!", daysAgo: 0.5, read: false },
        ],
      },
      {
        vehicle: vehicles[1],
        unread: 0,
        messages: [
          { fromSeller: false, text: "Hello, does this come with a full service history?", daysAgo: 10, read: true },
          { fromSeller: true, text: "Yes, full dealer service history stamped at every interval.", daysAgo: 9, read: true },
          { fromSeller: false, text: "Excellent! Can you tell me more about the condition of the interior?", daysAgo: 8, read: true },
          { fromSeller: true, text: "Interior is immaculate, no rips or stains. Like new.", daysAgo: 7, read: true },
        ],
      },
      {
        vehicle: vehicles[2],
        unread: 1,
        messages: [
          { fromSeller: false, text: "Hi there, is this Tesla still available?", daysAgo: 3, read: true },
          { fromSeller: true, text: "Yes! It's in excellent condition with Autopilot included.", daysAgo: 2, read: true },
          { fromSeller: false, text: "Great. What's the remaining battery warranty?", daysAgo: 2, read: true },
          { fromSeller: true, text: "Still has 6 years left on the 8 year battery warranty.", daysAgo: 1, read: false },
        ],
      },
      {
        vehicle: vehicles[3],
        unread: 0,
        messages: [
          { fromSeller: false, text: "I'm interested in the Audi A4. Is there any finance available?", daysAgo: 15, read: true },
          { fromSeller: true, text: "We can arrange finance through our dealership partner.", daysAgo: 14, read: true },
          { fromSeller: false, text: "What's the typical APR rate?", daysAgo: 13, read: true },
          { fromSeller: true, text: "Currently around 6.9% APR representative.", daysAgo: 12, read: true },
          { fromSeller: false, text: "Thanks, I'll check with my bank first.", daysAgo: 11, read: true },
          { fromSeller: true, text: "No problem, we'll hold it for 48 hours if you'd like.", daysAgo: 11, read: true },
        ],
      },
      {
        vehicle: vehicles[4],
        unread: 3,
        messages: [
          { fromSeller: false, text: "Hello! I love the look of this car. Any chance of a test drive?", daysAgo: 2, read: true },
          { fromSeller: true, text: "Absolutely! We can arrange one any weekday or Saturday morning.", daysAgo: 1, read: true },
          { fromSeller: true, text: "Just bring your driving licence and we're good to go.", daysAgo: 1, read: false },
          { fromSeller: true, text: "We also have a 14-day money-back guarantee on this model.", daysAgo: 0.3, read: false },
          { fromSeller: true, text: "Let me know which day suits you best!", daysAgo: 0.1, read: false },
        ],
      },
    ];

    for (const data of seedData) {
      const v = data.vehicle;
      const conv = await this.convRepo.save(
        this.convRepo.create({
          userId: testUser.id,
          sellerId: v.sellerId ?? 'seller1',
          sellerName: v.sellerName ?? 'Seller',
          vehicleId: v.id,
          vehicleTitle: `${v.make} ${v.model}`,
          vehicleImage: v.image ?? null,
        }),
      );

      for (const m of data.messages) {
        const senderId = m.fromSeller ? (v.sellerId ?? 'seller1') : testUser.id;
        const createdAt = new Date(now - m.daysAgo * day);
        await this.msgRepo
          .createQueryBuilder()
          .insert()
          .into(Message)
          .values({
            conversationId: conv.id,
            senderId,
            text: m.text,
            attachments: null,
            isRead: m.read,
            createdAt,
          } as any)
          .execute();
      }

      await this.convRepo.update(conv.id, {
        updatedAt: new Date(now - (data.messages[data.messages.length - 1].daysAgo) * day),
      });
    }

    console.log('✅ Conversations seeded (5 conversations)');
  }
}
