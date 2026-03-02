import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactSubmission } from './entities/contact-submission.entity';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactSubmission)
    private contactRepository: Repository<ContactSubmission>,
  ) {}

  async submitContact(data: {
    name: string;
    email: string;
    phone?: string;
    message: string;
    subject?: string;
  }) {
    const submission = this.contactRepository.create({
      ...data,
      type: 'contact',
    });
    const saved = await this.contactRepository.save(submission);
    return {
      message: 'Thank you for your message. We will get back to you shortly.',
      ticketId: `TKT-${saved.id.slice(0, 8).toUpperCase()}`,
    };
  }

  async submitComplaint(data: {
    type: string;
    targetId?: string;
    reason: string;
    details?: string;
    email: string;
  }) {
    const submission = this.contactRepository.create({
      email: data.email,
      type: 'complaint',
      subject: data.type,
      targetId: data.targetId,
      reason: data.reason,
      details: data.details,
    });
    const saved = await this.contactRepository.save(submission);
    return {
      message: 'Your complaint has been submitted. We will investigate and respond within 3 business days.',
      caseId: `CASE-${saved.id.slice(0, 8).toUpperCase()}`,
    };
  }

  // ── Admin ────────────────────────────────────────────────────────────────────

  async getAdminContacts(filters: {
    type?: string;
    resolved?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page  = Math.max(1, filters.page  ?? 1);
    const limit = Math.min(50, filters.limit ?? 20);

    const query = this.contactRepository
      .createQueryBuilder('c')
      .orderBy('c.submittedAt', 'DESC');

    if (filters.type && filters.type !== 'all') {
      query.andWhere('c.type = :type', { type: filters.type });
    }
    if (filters.resolved !== undefined) {
      query.andWhere('c.resolved = :resolved', { resolved: filters.resolved });
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async resolveContact(id: string) {
    await this.contactRepository.update(id, { resolved: true });
    const found = await this.contactRepository.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Submission not found');
    return found;
  }

  async deleteContact(id: string) {
    await this.contactRepository.delete({ id });
    return { success: true };
  }
}
