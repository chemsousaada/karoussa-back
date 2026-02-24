import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('saved_searches')
export class SavedSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.savedSearches, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  name: string;

  @Column('json')
  filters: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
