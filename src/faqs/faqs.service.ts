import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from './entities/faq.entity';

@Injectable()
export class FaqsService {
  constructor(
    @InjectRepository(Faq) private faqsRepository: Repository<Faq>,
  ) {}

  async findAll() {
    const faqs = await this.faqsRepository.find({
      where: { active: true },
      order: { order: 'ASC' },
    });
    return { data: faqs };
  }

  async seed() {
    const count = await this.faqsRepository.count();
    if (count > 0) return;

    const faqs = [
      {
        question: 'How do I sell my car on Autotrader?',
        answer: 'To sell your car, click on "Sell a Car" in the navigation, create an account or log in, then follow the steps to create your listing with photos and details.',
        category: 'selling',
        order: 1,
      },
      {
        question: 'Is it safe to buy from a private seller?',
        answer: 'Buying from a private seller can be safe if you take precautions: always view the car in person, check the V5C logbook, get an HPI check, and never pay without seeing the car.',
        category: 'buying',
        order: 2,
      },
      {
        question: 'What payment methods are accepted?',
        answer: 'We recommend bank transfer or payment in person. Never pay by wire transfer to someone you have not met. For added protection, consider using a car buying service.',
        category: 'payment',
        order: 3,
      },
      {
        question: 'How do I save a search?',
        answer: 'After running a search, click "Save this search" to save your filters. You can manage saved searches in your account dashboard.',
        category: 'buying',
        order: 4,
      },
      {
        question: 'How long does a listing stay active?',
        answer: 'Standard listings remain active for 14 days. Premium listings stay active for 30 days and receive more visibility.',
        category: 'selling',
        order: 5,
      },
    ];

    for (const faq of faqs) {
      const entity = this.faqsRepository.create(faq);
      await this.faqsRepository.save(entity);
    }
    console.log('✅ FAQs seeded');
  }
}
