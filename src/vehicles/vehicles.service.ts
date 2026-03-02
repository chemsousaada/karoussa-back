import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleView } from './entities/vehicle-view.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(VehicleView)
    private vehicleViewsRepository: Repository<VehicleView>,
    private usersService: UsersService,
  ) {}

  private toFrontendVehicle(v: Vehicle, savedVehicleIds: string[] = []) {
    return {
      id: v.id,
      make: v.make,
      model: v.model,
      variant: v.variant,
      attentionGrabber: v.attentionGrabber,
      year: v.year,
      price: Number(v.price),
      mileage: v.mileage,
      gearbox: v.gearbox,
      bodyType: v.bodyType,
      fuelType: v.fuelType,
      image: v.image,
      images: v.images,
      description: v.description,
      seller: {
        id: v.sellerId,
        name: v.sellerName,
        type: v.sellerType,
        rating: v.sellerRating ? Number(v.sellerRating) : undefined,
      },
      colour: v.colour,
      engine: v.engine,
      doors: v.doors,
      seats: v.seats,
      owners: v.owners,
      keys: v.keys,
      serviceHistory: v.serviceHistory,
      consumption: v.consumption,
      insuranceType: v.insuranceType,
      annualCost: v.annualCost,
      features: v.features,
      location: v.location,
      registrationDate: v.registrationDate,
      isActive: v.isActive,
      status: v.status ?? 'active',
      advertType: v.advertType ?? 'selling',
      vehicleCategory: v.vehicleCategory ?? null,
      unavailableDates: v.unavailableDates ?? [],
      createdAt: v.createdAt,
      isFavorite: savedVehicleIds.includes(v.id),
      viewsCount: v.viewsCount ?? 0,
      featuredUntil: v.featuredUntil ?? null,
    };
  }

  async findAll(filters: any, page = 1, limit = 20) {
    const query = this.vehiclesRepository.createQueryBuilder('vehicle');
    query.where('vehicle.isActive = :isActive', { isActive: true });

    if (filters.make) {
      query.andWhere('vehicle.make ILIKE :make', { make: `%${filters.make}%` });
    }
    if (filters.model) {
      query.andWhere('vehicle.model ILIKE :model', { model: `%${filters.model}%` });
    }
    if (filters.priceMin) {
      query.andWhere('vehicle.price >= :priceMin', { priceMin: Number(filters.priceMin) });
    }
    if (filters.priceMax) {
      query.andWhere('vehicle.price <= :priceMax', { priceMax: Number(filters.priceMax) });
    }
    if (filters.mileageMax) {
      query.andWhere('vehicle.mileage <= :mileageMax', { mileageMax: Number(filters.mileageMax) });
    }
    if (filters.yearMin) {
      query.andWhere('vehicle.year >= :yearMin', { yearMin: Number(filters.yearMin) });
    }
    if (filters.yearMax) {
      query.andWhere('vehicle.year <= :yearMax', { yearMax: Number(filters.yearMax) });
    }
    if (filters.gearbox) {
      const values = Array.isArray(filters.gearbox) ? filters.gearbox : [filters.gearbox];
      query.andWhere('vehicle.gearbox IN (:...gearbox)', { gearbox: values });
    }
    if (filters.fuelType) {
      const values = Array.isArray(filters.fuelType) ? filters.fuelType : [filters.fuelType];
      query.andWhere('vehicle.fuelType IN (:...fuelType)', { fuelType: values });
    }
    if (filters.bodyType) {
      const values = Array.isArray(filters.bodyType) ? filters.bodyType : [filters.bodyType];
      query.andWhere('vehicle.bodyType IN (:...bodyType)', { bodyType: values });
    }
    if (filters.sellerType) {
      const values = Array.isArray(filters.sellerType) ? filters.sellerType : [filters.sellerType];
      query.andWhere('vehicle.sellerType IN (:...sellerType)', { sellerType: values });
    }

    switch (filters.sort) {
      case 'price_asc':
        query.orderBy('vehicle.price', 'ASC');
        break;
      case 'price_desc':
        query.orderBy('vehicle.price', 'DESC');
        break;
      case 'mileage_asc':
        query.orderBy('vehicle.mileage', 'ASC');
        break;
      case 'date_desc':
      default:
        query.orderBy('vehicle.createdAt', 'DESC');
        break;
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map((v) => this.toFrontendVehicle(v)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const vehicle = await this.vehiclesRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return this.toFrontendVehicle(vehicle);
  }

  async findBySellerId(sellerId: string) {
    const vehicles = await this.vehiclesRepository.find({
      where: { sellerId, isActive: true },
      order: { createdAt: 'DESC' },
    });
    return vehicles.map((v) => this.toFrontendVehicle(v));
  }

  async findByUserId(userId: string) {
    const vehicles = await this.vehiclesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return {
      data: vehicles.map((v) => this.toFrontendVehicle(v)),
    };
  }

  async create(createData: any) {
    const vehicle = this.vehiclesRepository.create(createData);
    const saved = await this.vehiclesRepository.save(vehicle);
    return this.toFrontendVehicle(saved as unknown as Vehicle);
  }

  async update(id: string, updateData: Partial<Vehicle>) {
    await this.vehiclesRepository.update(id, updateData);
    return this.findById(id);
  }

  async recordView(vehicleId: string, userId: string): Promise<{ viewsCount: number }> {
    const vehicle = await this.vehiclesRepository.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const existing = await this.vehicleViewsRepository.findOne({
      where: { vehicleId, userId },
    });

    if (!existing) {
      await this.vehicleViewsRepository.save(
        this.vehicleViewsRepository.create({ vehicleId, userId }),
      );
      await this.vehiclesRepository.increment({ id: vehicleId }, 'viewsCount', 1);
      const prevCount = vehicle.viewsCount ?? 0;
      vehicle.viewsCount = prevCount + 1;

      // Step 4: Notify advert owner when their listing reaches 100 views
      if (prevCount < 100 && vehicle.viewsCount >= 100 && vehicle.userId) {
        await this.usersService.createNotification(
          vehicle.userId,
          'Your advert reached 100 views! 🎉',
          `Your listing "${vehicle.make} ${vehicle.model} (${vehicle.year})" has just reached 100 views. Great visibility!`,
          `/vehicle/${vehicle.id}`,
        ).catch(() => {});
      }
    }

    return { viewsCount: vehicle.viewsCount ?? 0 };
  }

  /** Step 5: Check for expired sponsorships and notify owners (called by cron). */
  async checkSponsorshipExpiry() {
    const now = new Date();
    const expired = await this.vehiclesRepository
      .createQueryBuilder('v')
      .where('v.featuredUntil IS NOT NULL')
      .andWhere('v.featuredUntil <= :now', { now })
      .andWhere('v.userId IS NOT NULL')
      .getMany();

    for (const v of expired) {
      await this.vehiclesRepository.update(v.id, { featuredUntil: null });
      await this.usersService.createNotification(
        v.userId,
        'Sponsorship ended for your advert',
        `The sponsored promotion for "${v.make} ${v.model} (${v.year})" has ended. Renew it to stay at the top of search results.`,
        `/vehicle/${v.id}`,
      ).catch(() => {});
    }
  }

  async delete(id: string, userId: string) {
    const vehicle = await this.vehiclesRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    if (vehicle.userId && vehicle.userId !== userId) {
      throw new ForbiddenException('You are not allowed to delete this advert');
    }
    await this.vehiclesRepository.delete(id);
    return { success: true };
  }

  async seed() {
    const count = await this.vehiclesRepository.count();
    if (count > 0) return;

    const vehicles = [
      {
        make: 'BMW',
        model: '3 Series',
        variant: '2.0 320d M Sport Touring Auto Euro 6 (s/s) 5dr',
        attentionGrabber: 'LOW MILEAGE!',
        year: 2022,
        price: 35000,
        mileage: 15000,
        gearbox: 'automatic',
        bodyType: 'sedan',
        fuelType: 'diesel',
        image: 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=60',
        images: [
          'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1494976866556-6812c9d1c72e?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?auto=format&fit=crop&w=1200&q=60',
        ],
        description: 'Excellent condition, fully serviced BMW 3 Series with premium package.',
        sellerId: 'seller1',
        sellerName: 'John Motors',
        sellerType: 'dealer',
        sellerRating: 4.8,
        location: 'London, UK',
        registrationDate: '2022-03-15',
      },
      {
        make: 'Mercedes-Benz',
        model: 'C-Class',
        variant: 'C 220 d AMG Line 9G-Tronic Euro 6 (s/s) 4dr',
        year: 2021,
        price: 32000,
        mileage: 22000,
        gearbox: 'automatic',
        bodyType: 'sedan',
        fuelType: 'diesel',
        image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=60',
        images: [
          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1494976866556-6812c9d1c72e?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=60',
        ],
        description: 'Low mileage Mercedes C-Class with AMG styling package.',
        sellerId: 'seller2',
        sellerName: 'Private Seller',
        sellerType: 'private',
        sellerRating: null,
        location: 'Manchester, UK',
        registrationDate: '2021-06-20',
      },
      {
        make: 'Tesla',
        model: 'Model 3',
        variant: 'Long Range AWD Auto 4dr',
        attentionGrabber: 'ONE OWNER FROM NEW!',
        year: 2023,
        price: 45000,
        mileage: 5000,
        gearbox: 'automatic',
        bodyType: 'sedan',
        fuelType: 'electric',
        image: 'https://images.unsplash.com/photo-1538332191719-9d28305b6f0e?auto=format&fit=crop&w=1200&q=60',
        images: [
          'https://images.unsplash.com/photo-1538332191719-9d28305b6f0e?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1560958089-b8a46dd52956?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1560958090-fcfddca3ae6b?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1517654931202-3fd717c8d76f?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1489578066156-fce18d84f136?auto=format&fit=crop&w=1200&q=60',
        ],
        description: 'Nearly new Tesla Model 3 with Supercharger access included.',
        sellerId: 'seller3',
        sellerName: 'Electric Vehicles Ltd',
        sellerType: 'dealer',
        sellerRating: 4.9,
        location: 'Birmingham, UK',
        registrationDate: '2023-01-10',
      },
      {
        make: 'Audi',
        model: 'A4',
        variant: '2.0 TDI 40 S Line S Tronic Euro 6 (s/s) 4dr',
        year: 2020,
        price: 28000,
        mileage: 45000,
        gearbox: 'manual',
        bodyType: 'sedan',
        fuelType: 'diesel',
        image: 'https://images.unsplash.com/photo-1606611013016-969c19d14444?auto=format&fit=crop&w=1200&q=60',
        images: [
          'https://images.unsplash.com/photo-1606611013016-969c19d14444?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1494976866556-6812c9d1c72e?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?auto=format&fit=crop&w=1200&q=60',
        ],
        description: 'Reliable Audi A4 with service history included.',
        sellerId: 'seller4',
        sellerName: 'David Cars',
        sellerType: 'dealer',
        sellerRating: 4.5,
        location: 'Bristol, UK',
        registrationDate: '2020-11-05',
      },
      {
        make: 'Land Rover',
        model: 'Range Rover Evoque',
        variant: '2.0 D165 R-Dynamic S Auto 4WD Euro 6 (s/s) 5dr',
        attentionGrabber: 'GREAT CONDITION!',
        year: 2023,
        price: 52000,
        mileage: 8000,
        gearbox: 'automatic',
        bodyType: 'suv',
        fuelType: 'hybrid',
        image: 'https://images.unsplash.com/photo-1549399542-7e3f8b83ad38?auto=format&fit=crop&w=1200&q=60',
        images: [
          'https://images.unsplash.com/photo-1549399542-7e3f8b83ad38?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1494976866556-6812c9d1c72e?auto=format&fit=crop&w=1200&q=60',
        ],
        description: 'Luxury SUV with all latest features and warranty.',
        sellerId: 'seller5',
        sellerName: 'Premium Motors',
        sellerType: 'dealer',
        sellerRating: 4.7,
        location: 'London, UK',
        registrationDate: '2023-02-20',
      },
      {
        make: 'Ford',
        model: 'Focus',
        variant: '1.0T EcoBoost ST-Line Euro 6 (s/s) 5dr',
        year: 2019,
        price: 8950,
        mileage: 62000,
        gearbox: 'manual',
        bodyType: 'hatchback',
        fuelType: 'petrol',
        image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=60',
        images: [
          'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1494976866556-6812c9d1c72e?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=60',
        ],
        description: 'Reliable Ford Focus, full service history, one previous owner.',
        sellerId: 'seller5',
        sellerName: 'Premium Motors',
        sellerType: 'dealer',
        sellerRating: 4.3,
        location: 'London, UK',
        registrationDate: '2019-07-12',
      },
      {
        make: 'Volkswagen',
        model: 'Golf',
        variant: '1.5 TSI EVO Match Euro 6 (s/s) 5dr',
        year: 2020,
        price: 16500,
        mileage: 34000,
        gearbox: 'manual',
        bodyType: 'hatchback',
        fuelType: 'petrol',
        image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=60',
        images: [
          'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=60',
        ],
        description: 'Excellent Volkswagen Golf, low mileage, great condition throughout.',
        sellerId: 'seller5',
        sellerName: 'Premium Motors',
        sellerType: 'dealer',
        sellerRating: 4.6,
        location: 'London, UK',
        registrationDate: '2020-04-18',
      },
      {
        make: 'Vauxhall',
        model: 'Corsa',
        variant: '1.2T 130 GS Line Auto Euro 6 (s/s) 5dr',
        attentionGrabber: 'NEARLY NEW!',
        year: 2021,
        price: 11200,
        mileage: 18000,
        gearbox: 'automatic',
        bodyType: 'hatchback',
        fuelType: 'petrol',
        image: 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?auto=format&fit=crop&w=1200&q=60',
        images: [
          'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1494976866556-6812c9d1c72e?auto=format&fit=crop&w=1200&q=60',
        ],
        description: 'Nearly new Vauxhall Corsa with low mileage and full warranty.',
        sellerId: 'seller5',
        sellerName: 'Premium Motors',
        sellerType: 'dealer',
        sellerRating: 4.4,
        location: 'London, UK',
        registrationDate: '2021-09-03',
      },
      {
        make: 'Toyota',
        model: 'Yaris',
        variant: '1.5 Hybrid Design CVT Euro 6 (s/s) 5dr',
        year: 2020,
        price: 13500,
        mileage: 28000,
        gearbox: 'automatic',
        bodyType: 'hatchback',
        fuelType: 'hybrid',
        image: 'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=1200&q=60',
        images: [
          'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=60',
        ],
        description: 'Fuel-efficient Toyota Yaris Hybrid, perfect city car.',
        sellerId: 'seller1',
        sellerName: 'John Motors',
        sellerType: 'dealer',
        sellerRating: 4.2,
        location: 'London, UK',
        registrationDate: '2020-08-15',
      },
      {
        make: 'Honda',
        model: 'Civic',
        variant: '1.5 VTEC Turbo Sport Plus CVT Euro 6 (s/s) 5dr',
        year: 2021,
        price: 19800,
        mileage: 25000,
        gearbox: 'manual',
        bodyType: 'sedan',
        fuelType: 'petrol',
        image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=60',
        images: [
          'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=60',
          'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=60',
        ],
        description: 'Sporty Honda Civic with low mileage and full service history.',
        sellerId: 'seller1',
        sellerName: 'John Motors',
        sellerType: 'dealer',
        sellerRating: 4.1,
        location: 'London, UK',
        registrationDate: '2021-03-22',
      },
    ];

    for (const vehicleData of vehicles) {
      const vehicle = this.vehiclesRepository.create(vehicleData as any);
      await this.vehiclesRepository.save(vehicle);
    }

    console.log('✅ Vehicles seeded');
  }
}
