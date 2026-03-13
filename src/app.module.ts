import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { SavedModule } from './saved/saved.module';
import { ArticlesModule } from './articles/articles.module';
import { FaqsModule } from './faqs/faqs.module';
import { ContactModule } from './contact/contact.module';
import { ConversationsModule } from './conversations/conversations.module';
import { PlansModule } from './plans/plans.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';
import { BookingsModule } from './bookings/bookings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'autotrader'),
        password: configService.get('DB_PASSWORD', 'autotrader'),
        database: configService.get('DB_NAME', 'autotrader'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: ['error', 'warn'],
      }),
    }),
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    VehiclesModule,
    SavedModule,
    ArticlesModule,
    FaqsModule,
    ContactModule,
    ConversationsModule,
    PlansModule,
    ScheduledTasksModule,
    BookingsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
