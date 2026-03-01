import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('vehicle_views')
@Unique(['vehicleId', 'userId'])
export class VehicleView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vehicleId: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
