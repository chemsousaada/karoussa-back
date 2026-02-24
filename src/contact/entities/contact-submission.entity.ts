import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('contact_submissions')
export class ContactSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  // For complaints
  @Column({ nullable: true })
  type: string; // 'contact' | 'complaint'

  @Column({ nullable: true })
  targetId: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ default: false })
  resolved: boolean;

  @CreateDateColumn()
  submittedAt: Date;
}
