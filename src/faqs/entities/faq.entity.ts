import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('faqs')
export class Faq {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  question: string;

  @Column('text')
  answer: string;

  @Column({ nullable: true })
  category: string;

  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  active: boolean;
}
