import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserNotification } from './entities/user-notification.entity';
import { ScheduledNotification } from './entities/scheduled-notification.entity';
import { SubscriptionRequest } from './entities/subscription-request.entity';
import { AdminInquiry } from './entities/admin-inquiry.entity';
import { InquiryMessage } from './entities/inquiry-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserNotification, ScheduledNotification, SubscriptionRequest, AdminInquiry, InquiryMessage]),
    MulterModule.register({ dest: './uploads/profiles' }),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule implements OnModuleInit {
  constructor(private usersService: UsersService) {}

  async onModuleInit() {
    await this.usersService.seed();
  }
}
