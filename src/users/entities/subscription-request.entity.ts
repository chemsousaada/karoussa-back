import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('subscription_requests')
export class SubscriptionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  userName: string;

  @Column()
  userEmail: string;

  @Column({ default: 'free' })
  currentPlan: string;

  @Column()
  requestedPlan: string;

  @Column()
  duration: number; // months

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // total price after all discounts

  @Column({ nullable: true })
  promoCode: string;

  @Column({ nullable: true, default: 0 })
  discountPct: number; // total % discount applied

  @Column()
  paymentMethod: string; // 'card' | 'bank_transfer' | 'cash'

  @Column({ default: 'pending' })
  status: string; // 'pending' | 'accepted' | 'denied'

  @Column({ nullable: true })
  adminNote: string;

  @Column({ nullable: true })
  notifyMethod: string; // 'email' | 'sms' | 'notification'

  @Column({ nullable: true })
  adjustedDuration: number; // admin may override duration at acceptance

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
