import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface SelectedAdvert {
  id: string;
  title: string;
  duration: string; // e.g. '3 days', '1 week', '2 weeks', '1 month'
}

@Entity('admin_inquiries')
export class AdminInquiry {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() userId: string;
  @Column() userName: string;
  @Column() userEmail: string;

  @Column() requestedPlan: string; // 'rental_agency' | 'mix'

  @Column({ type: 'jsonb', default: '[]' })
  selectedAdverts: SelectedAdvert[];

  @Column({ type: 'text' }) message: string;

  // 'pending' = submitted, admin hasn't replied
  // 'open'    = admin replied, chat is active
  // 'resolved' = closed, user can no longer reply
  @Column({ default: 'pending' }) status: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
