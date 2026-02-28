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

  // User type: 'individual' or 'store'
  @Column({ default: 'individual' })
  userType: string;

  // Personal info
  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  town: string;

  // Store-specific fields
  @Column({ nullable: true })
  storeName: string;

  @Column({ nullable: true })
  storePhone1: string;

  @Column({ nullable: true })
  storePhone2: string;

  @Column({ nullable: true })
  storeEmail: string;

  @Column({ nullable: true })
  storeWebsite: string;

  @Column({ nullable: true })
  storeAddress: string;

  @Column({ nullable: true })
  storeCity: string;

  @Column({ nullable: true })
  storeTown: string;

  @Column({ type: 'json', nullable: true })
  openingHours: Record<string, any>;

  // Rental Agency – multiple locations
  @Column({ type: 'json', nullable: true })
  agencyAddresses: { street: string; city: string; town: string }[];

  // Rental Agency – rent process
  @Column({ type: 'json', nullable: true })
  rentConditions: string[];

  @Column({ type: 'json', nullable: true })
  acceptedDocuments: string[];

  @Column({ type: 'json', nullable: true })
  paymentMethods: string[];

  /** Up to 3 profile photos – relative URLs like /uploads/profiles/... */
  @Column({ type: 'json', nullable: true })
  profilePhotos: string[];

  /** About us text for stores and agencies */
  @Column({ type: 'varchar', length: 5000, nullable: true })
  about: string;

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
