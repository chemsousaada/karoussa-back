import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('plans')
export class Plan {
  @PrimaryColumn() id: string;
  @Column() name: string;
  @Column({ default: '⚫' }) dot: string;
  @Column({ default: '#6B7280' }) color: string;
  @Column({ default: '#F9FAFB' }) bg: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) price: number;
  @Column({ default: '' }) billingCycle: string;
  @Column({ type: 'jsonb', default: '[]' }) features: string[];
  @Column({ default: true }) enabled: boolean;
  @Column({ default: 0 }) subscribers: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) revenue: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
