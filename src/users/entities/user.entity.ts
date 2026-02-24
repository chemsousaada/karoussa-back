import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SavedAdvert } from '../../saved/entities/saved-advert.entity';
import { SavedSearch } from '../../saved/entities/saved-search.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true, default: 'free' })
  subscriptionPlan: string;

  @Column({ nullable: true })
  subscriptionExpiresAt: string;

  // Email notification preferences
  @Column({ default: true })
  notifyNewListings: boolean;

  @Column({ default: true })
  notifySavedSearches: boolean;

  @Column({ default: true })
  notifyMessages: boolean;

  @Column({ default: false })
  notifyNewsletter: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SavedAdvert, (saved) => saved.user, { cascade: true })
  savedAdverts: SavedAdvert[];

  @OneToMany(() => SavedSearch, (search) => search.user, { cascade: true })
  savedSearches: SavedSearch[];
}
