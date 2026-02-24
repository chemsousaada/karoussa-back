import { Injectable } from '@nestjs/common';
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
}
