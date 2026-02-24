import { Controller, Post, Body } from '@nestjs/common';
import { ContactService } from './contact.service';

@Controller('api/mock/contact')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post()
  async submitContact(@Body() body: any) {
    return this.contactService.submitContact(body);
  }

  @Post('complaint')
  async submitComplaint(@Body() body: any) {
    return this.contactService.submitComplaint(body);
  }
}
