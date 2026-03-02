import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('scheduled_notifications')
export class ScheduledNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** null = broadcast to all users; array of IDs = targeted */
  @Column({ type: 'json', nullable: true })
  userIds: string[] | null;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  message: string;

  /** URL to navigate to when the notification is clicked */
  @Column({ nullable: true })
  link: string;

  /** One of: Subscription, Message, Support, Report */
  @Column({ nullable: true })
  notifType: string;

  @Column({ type: 'timestamp' })
  scheduledFor: Date;

  @Column({ default: 'pending' })
  status: string; // 'pending' | 'sent'

  @CreateDateColumn()
  createdAt: Date;
}
