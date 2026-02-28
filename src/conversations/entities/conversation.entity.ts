import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Message } from './message.entity';
import { Report } from './report.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The user who initiated the conversation (buyer) */
  @Column()
  userId: string;

  /** Seller identifier – may be a denormalized string like 'seller1' */
  @Column()
  sellerId: string;

  /** Denormalized seller display name */
  @Column({ nullable: true })
  sellerName: string;

  @Column()
  vehicleId: string;

  @Column()
  vehicleTitle: string;

  @Column({ nullable: true })
  vehicleImage: string;

  @Column({ default: false })
  userDeleted: boolean;

  @Column({ default: false })
  sellerDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Message, msg => msg.conversation, { cascade: true })
  messages: Message[];

  @OneToMany(() => Report, r => r.conversation, { cascade: true })
  reports: Report[];
}
