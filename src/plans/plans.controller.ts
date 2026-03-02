import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { PlansService } from './plans.service';
import { Plan } from './entities/plan.entity';

@Controller('api/mock/plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  /** GET /api/mock/plans — public, returns only enabled plans sorted by price */
  @Get()
  getEnabled() {
    return this.plansService.findAll(true);
  }

  /** GET /api/mock/plans/all — admin, returns all plans */
  @Get('all')
  getAll() {
    return this.plansService.findAll(false);
  }

  /** POST /api/mock/plans — admin, create a new plan */
  @Post()
  create(@Body() dto: Partial<Plan>) {
    return this.plansService.create(dto);
  }

  /** PUT /api/mock/plans/bulk — admin, batch update price/enabled */
  @Put('bulk')
  bulkUpdate(@Body() updates: Array<{ id: string; enabled?: boolean; price?: number }>) {
    return this.plansService.bulkUpdate(updates);
  }

  /** PUT /api/mock/plans/:id — admin, update a single plan */
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<Plan>) {
    return this.plansService.update(id, dto);
  }
}
