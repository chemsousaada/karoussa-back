import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  slug: string;

  @Column({ nullable: true })
  excerpt: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  author: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  publishedAt: string;

  @Column({ nullable: true })
  readTime: string;

  @Column({ default: 0 })
  views: number;

  @CreateDateColumn()
  createdAt: Date;
}
