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

  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (v: string[]) => (v && v.length ? JSON.stringify(v) : null),
      from: (v: string) => {
        if (!v) return [];
        try {
          return JSON.parse(v);
        } catch {
          // Legacy simple-array format: comma-separated URLs
          return v.split(',').filter(Boolean);
        }
      },
    },
  })
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
  colour: string;

  @Column({ nullable: true })
  engine: string; // e.g. '1.5L', '2.0L TDI'

  @Column({ nullable: true })
  doors: number;

  @Column({ nullable: true })
  seats: number;

  // Vehicle history
  @Column({ nullable: true })
  owners: number; // number of previous owners

  @Column({ nullable: true })
  keys: string; // '1' | '2' | '3+' | 'Unknown'

  @Column({ nullable: true })
  serviceHistory: string; // 'Full' | 'Partial' | 'None' | 'Contact seller'

  // Running costs
  @Column({ nullable: true })
  consumption: string; // e.g. '61.0 l/100km' or '48 MPG'

  @Column({ nullable: true })
  insuranceType: string; // e.g. 'Comprehensive'

  @Column({ nullable: true })
  annualCost: string; // e.g. '1200'

  // Features / extras
  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (v: string[]) => (v && v.length ? JSON.stringify(v) : null),
      from: (v: string) => {
        if (!v) return [];
        try {
          return JSON.parse(v);
        } catch {
          return v.split(',').filter(Boolean);
        }
      },
    },
  })
  features: string[];

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  registrationDate: string;

  // Rental-specific fields
  @Column({ nullable: true, default: 'selling' })
  advertType: string; // 'selling' | 'rental'

  @Column({ type: 'varchar', length: 30, nullable: true })
  vehicleCategory: string; // e.g. 'new_car' | 'used_car' | 'new_utility' | ... | 'car' | 'utility' | 'machine'

  @Column({ nullable: true, default: false })
  unlimitedMileage: boolean;

  @Column({ type: 'text', nullable: true })
  priceDetails: string;

  @Column({ nullable: true, default: false })
  isPricePerDay: boolean;

  @Column({ nullable: true, default: false })
  possibleDropOff: boolean;

  @Column({ type: 'json', nullable: true })
  dropOffLocations: { addressIndex: number; active: boolean; pricePerDay: string }[];

  @Column({ type: 'json', nullable: true })
  unavailableDates: string[];

  // The user who created this advert
  @Column({ nullable: true })
  userId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, default: 'active' })
  status: string; // 'active' | 'sold' | 'inactive'

  @Column({ default: 0 })
  viewsCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SavedAdvert, (saved) => saved.vehicle, { cascade: true })
  savedBy: SavedAdvert[];
}
