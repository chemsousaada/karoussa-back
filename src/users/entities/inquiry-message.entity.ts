import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('inquiry_messages')
export class InquiryMessage {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() inquiryId: string;

  @Column() senderType: string; // 'user' | 'admin'

  @Column({ type: 'text' }) content: string;

  @CreateDateColumn() createdAt: Date;
}
