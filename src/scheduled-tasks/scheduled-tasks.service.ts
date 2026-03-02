import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';
import { VehiclesService } from '../vehicles/vehicles.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    private usersService: UsersService,
    private vehiclesService: VehiclesService,
  ) {}

  /** Every minute: process pending scheduled notifications */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications() {
    try {
      await this.usersService.processPendingScheduled();
    } catch (err) {
      this.logger.error('Failed to process scheduled notifications', err);
    }
  }

  /** Every day at midnight: check for expired sponsorships (Step 5) */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkSponsorships() {
    try {
      await this.vehiclesService.checkSponsorshipExpiry();
    } catch (err) {
      this.logger.error('Failed to check sponsorship expiry', err);
    }
  }
}
