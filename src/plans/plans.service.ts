import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';

const SEED_PLANS: Partial<Plan>[] = [
  { id: 'free',          name: 'Free',          dot: '🟢', color: '#059669', bg: '#F0FDF4', price: 0,     billingCycle: '',       subscribers: 842, revenue: 0,       features: ['2 active listings', '2-week lifetime', '5+5 photos'] },
  { id: 'plus',          name: 'Plus',          dot: '🔵', color: '#3B82F6', bg: '#EFF6FF', price: 9.99,  billingCycle: '/month', subscribers: 261, revenue: 2607.39, features: ['4 active listings', '3-week lifetime', '10+10 photos', '1 sponsored listing'] },
  { id: 'dealer',        name: 'Dealer',        dot: '🟣', color: '#7C3AED', bg: '#F5F3FF', price: 29.99, billingCycle: '/month', subscribers: 87,  revenue: 2609.13, features: ['10 active listings', '4-week lifetime', '30+30 photos', '4 sponsored', 'Dealer profile'] },
  { id: 'rental_agency', name: 'Rental Agency', dot: '🟠', color: '#EA580C', bg: '#FFF7ED', price: 49.99, billingCycle: '/month', subscribers: 34,  revenue: 1699.66, features: ['20 listings', 'Unlimited lifetime', 'Reservation management', 'Agency profile'] },
  { id: 'mix',           name: 'Mix',           dot: '🔴', color: '#EF4444', bg: '#FEF2F2', price: 59.99, billingCycle: '/month', subscribers: 23,  revenue: 1379.77, features: ['30 listings', 'Sales + Rental', 'Unified dashboard', 'Dedicated manager'] },
];

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private plansRepo: Repository<Plan>,
  ) {}

  async seed() {
    const count = await this.plansRepo.count();
    if (count === 0) {
      for (const p of SEED_PLANS) {
        await this.plansRepo.save(this.plansRepo.create({ ...p, enabled: true }));
      }
    }
  }

  findAll(enabledOnly = false): Promise<Plan[]> {
    const where = enabledOnly ? { enabled: true } : {};
    return this.plansRepo.find({ where, order: { price: 'ASC' } });
  }

  findOne(id: string): Promise<Plan | null> {
    return this.plansRepo.findOneBy({ id });
  }

  async create(dto: Partial<Plan>): Promise<Plan> {
    const plan = this.plansRepo.create({ ...dto, enabled: true, subscribers: 0, revenue: 0 });
    return this.plansRepo.save(plan);
  }

  async update(id: string, dto: Partial<Plan>): Promise<Plan | null> {
    await this.plansRepo.update(id, dto);
    return this.plansRepo.findOneBy({ id });
  }

  async bulkUpdate(updates: Array<{ id: string; enabled?: boolean; price?: number }>): Promise<Plan[]> {
    for (const { id, ...rest } of updates) {
      if (Object.keys(rest).length > 0) {
        await this.plansRepo.update(id, rest as Partial<Plan>);
      }
    }
    return this.findAll();
  }
}
