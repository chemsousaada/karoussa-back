import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type BookingStatus = 'pending' | 'accepted' | 'denied' | 'cancelled';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Vehicle info (snapshot from mock data)
  @Column()
  vehicleId: string;

  @Column()
  vehicleName: string;

  @Column({ nullable: true })
  vehicleImage: string;

  @Column({ nullable: true })
  vehicleLocation: string;

  @Column({ type: 'int' })
  pricePerDay: number;

  // User who made the booking
  @Column()
  userId: string;

  @Column()
  userName: string;

  @Column()
  userEmail: string;

  // Agency user who owns the vehicle listing (nullable for mock)
  @Column({ nullable: true })
  agencyUserId: string;

  // Dates
  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  // Status
  @Column({ default: 'pending' })
  status: BookingStatus;

  // Messages
  @Column({ nullable: true })
  userMessage: string;

  @Column({ nullable: true })
  agencyResponse: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
