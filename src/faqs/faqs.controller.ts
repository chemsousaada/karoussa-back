import { Controller, Get } from '@nestjs/common';
import { FaqsService } from './faqs.service';

@Controller('api/mock')
export class FaqsController {
  constructor(private faqsService: FaqsService) {}

  @Get('faqs')
  async getFaqs() {
    return this.faqsService.findAll();
  }
}
