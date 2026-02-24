import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedService } from './saved.service';
import { SavedController } from './saved.controller';
import { SavedAdvert } from './entities/saved-advert.entity';
import { SavedSearch } from './entities/saved-search.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SavedAdvert, SavedSearch])],
  providers: [SavedService],
  controllers: [SavedController],
})
export class SavedModule {}
