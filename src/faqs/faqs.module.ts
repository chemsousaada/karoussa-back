import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaqsService } from './faqs.service';
import { FaqsController } from './faqs.controller';
import { Faq } from './entities/faq.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Faq])],
  providers: [FaqsService],
  controllers: [FaqsController],
})
export class FaqsModule implements OnModuleInit {
  constructor(private faqsService: FaqsService) {}

  async onModuleInit() {
    await this.faqsService.seed();
  }
}
