import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

@Entity('saved_adverts')
export class SavedAdvert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.savedAdverts, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.savedBy, { onDelete: 'CASCADE' })
  vehicle: Vehicle;

  @CreateDateColumn()
  savedAt: Date;
}
