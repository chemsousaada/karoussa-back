import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SavedAdvert } from '../../saved/entities/saved-advert.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  make: string;

  @Column()
  model: string;

  @Column({ nullable: true })
  variant: string;

  @Column({ nullable: true })
  attentionGrabber: string;

  @Column()
  year: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  mileage: number;

  @Column({ type: 'varchar', length: 20 })
  gearbox: string; // 'manual' | 'automatic'

  @Column({ type: 'varchar', length: 30 })
  bodyType: string; // 'sedan' | 'suv' | 'coupe' | 'hatchback' | 'estate'

  @Column({ type: 'varchar', length: 20 })
  fuelType: string; // 'petrol' | 'diesel' | 'hybrid' | 'electric'

  @Column({ nullable: true })
  image: string;

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  // Seller info (denormalized to match frontend Vehicle interface)
  @Column()
  sellerId: string;

  @Column()
  sellerName: string;

  @Column({ type: 'varchar', length: 20 })
  sellerType: string; // 'private' | 'dealer'

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  sellerRating: number;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  registrationDate: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SavedAdvert, (saved) => saved.vehicle, { cascade: true })
  savedBy: SavedAdvert[];
}
