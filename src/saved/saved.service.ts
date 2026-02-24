import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedAdvert } from './entities/saved-advert.entity';
import { SavedSearch } from './entities/saved-search.entity';

@Injectable()
export class SavedService {
  constructor(
    @InjectRepository(SavedAdvert)
    private savedAdvertsRepository: Repository<SavedAdvert>,
    @InjectRepository(SavedSearch)
    private savedSearchesRepository: Repository<SavedSearch>,
  ) {}

  async getSavedAdverts(userId: string) {
    const adverts = await this.savedAdvertsRepository.find({
      where: { user: { id: userId } },
      relations: ['vehicle'],
    });
    return {
      data: adverts.map((a) => ({
        id: a.id,
        savedAt: a.savedAt,
        vehicle: a.vehicle
          ? {
              id: a.vehicle.id,
              make: a.vehicle.make,
              model: a.vehicle.model,
              variant: a.vehicle.variant,
              attentionGrabber: a.vehicle.attentionGrabber,
              year: a.vehicle.year,
              price: Number(a.vehicle.price),
              mileage: a.vehicle.mileage,
              image: a.vehicle.image,
              images: a.vehicle.images,
              location: a.vehicle.location,
              gearbox: a.vehicle.gearbox,
              fuelType: a.vehicle.fuelType,
              bodyType: a.vehicle.bodyType,
              registrationDate: a.vehicle.registrationDate,
              description: a.vehicle.description,
              seller: {
                id: a.vehicle.sellerId,
                name: a.vehicle.sellerName,
                type: a.vehicle.sellerType,
                rating: a.vehicle.sellerRating ? Number(a.vehicle.sellerRating) : undefined,
              },
              isFavorite: true,
            }
          : null,
      })),
    };
  }

  async addSavedAdvert(userId: string, vehicleId: string) {
    const saved = this.savedAdvertsRepository.create({
      user: { id: userId },
      vehicle: { id: vehicleId },
    });
    const result = await this.savedAdvertsRepository.save(saved);
    return { id: result.id, vehicleId, message: 'Advert saved successfully' };
  }

  async removeSavedAdvert(userId: string, savedId: string) {
    const saved = await this.savedAdvertsRepository.findOne({
      where: { id: savedId },
      relations: ['user'],
    });
    if (!saved || saved.user.id !== userId) {
      throw new NotFoundException('Saved advert not found');
    }
    await this.savedAdvertsRepository.remove(saved);
    return { message: 'Advert removed from saved' };
  }

  async getSavedSearches(userId: string) {
    const searches = await this.savedSearchesRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
    return { data: searches };
  }

  async addSavedSearch(userId: string, name: string, filters: any) {
    const search = this.savedSearchesRepository.create({
      user: { id: userId },
      name,
      filters,
    });
    return this.savedSearchesRepository.save(search);
  }

  async removeSavedSearch(userId: string, searchId: string) {
    const search = await this.savedSearchesRepository.findOne({
      where: { id: searchId },
      relations: ['user'],
    });
    if (!search || search.user.id !== userId) {
      throw new NotFoundException('Saved search not found');
    }
    await this.savedSearchesRepository.remove(search);
    return { message: 'Search removed from saved' };
  }
}
