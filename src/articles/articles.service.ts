import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article) private articlesRepository: Repository<Article>,
  ) {}

  async findAll(page = 1, limit = 10) {
    const [data, total] = await this.articlesRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async seed() {
    const count = await this.articlesRepository.count();
    if (count > 0) return;

    const articles = [
      {
        title: 'How to Buy a Used Car: Complete Guide for 2024',
        slug: 'how-to-buy-used-car-guide',
        excerpt: 'Everything you need to know before purchasing a second-hand vehicle, from inspections to financing.',
        content: 'Buying a used car can be a great way to save money, but it requires careful research and inspection. In this guide, we cover everything from setting your budget to negotiating the best price...',
        author: 'Auto Expert',
        category: 'Buying Guide',
        image: 'https://images.unsplash.com/photo-1549399542-7e3f8b83ad38?auto=format&fit=crop&w=800&q=60',
        publishedAt: '2024-01-15',
        readTime: '8 min read',
      },
      {
        title: 'EV Charging Guide: Everything You Need to Know',
        slug: 'ev-charging-guide',
        excerpt: 'A comprehensive overview of electric vehicle charging options, costs, and tips for home and public charging.',
        content: 'Electric vehicles are becoming increasingly popular. Understanding how to charge your EV efficiently can save you time and money. This guide covers all charging levels, home installation, and public network options...',
        author: 'EV Specialist',
        category: 'Electric Vehicles',
        image: 'https://images.unsplash.com/photo-1560958089-b8a46dd52956?auto=format&fit=crop&w=800&q=60',
        publishedAt: '2024-02-01',
        readTime: '6 min read',
      },
      {
        title: 'Top 10 Most Reliable Cars of 2023',
        slug: 'most-reliable-cars-2023',
        excerpt: 'Based on owner surveys and reliability data, here are the most dependable vehicles you can buy.',
        content: 'Reliability is one of the most important factors when choosing a car. We analyzed thousands of owner reviews and reliability surveys to bring you the top 10 most reliable cars of 2023...',
        author: 'Auto Expert',
        category: 'Reviews',
        image: 'https://images.unsplash.com/photo-1506116774-6b2c05da27c3?auto=format&fit=crop&w=800&q=60',
        publishedAt: '2024-01-28',
        readTime: '5 min read',
      },
    ];

    for (const article of articles) {
      const entity = this.articlesRepository.create(article);
      await this.articlesRepository.save(entity);
    }
    console.log('✅ Articles seeded');
  }
}
