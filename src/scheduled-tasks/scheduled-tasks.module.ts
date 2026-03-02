import { Module } from '@nestjs/common';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { UsersModule } from '../users/users.module';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [UsersModule, VehiclesModule],
  providers: [ScheduledTasksService],
})
export class ScheduledTasksModule {}
