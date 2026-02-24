import { Controller, Get, Post, Put, Body, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VehiclesService } from './vehicles.service';

@Controller('api/mock')
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Get('search')
  async search(@Query() filters: any) {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    return this.vehiclesService.findAll(filters, page, limit);
  }

  @Get('vehicles/:id')
  async getVehicle(@Param('id') id: string) {
    return this.vehiclesService.findById(id);
  }

  @Post('vehicles')
  @UseGuards(JwtAuthGuard)
  async createVehicle(@Body() body: any) {
    return this.vehiclesService.create(body);
  }

  @Put('vehicles/:id')
  @UseGuards(JwtAuthGuard)
  async updateVehicle(@Param('id') id: string, @Body() body: any) {
    return this.vehiclesService.update(id, body);
  }

  @Get('sellers/:id')
  async getSeller(@Param('id') sellerId: string) {
    const vehicles = await this.vehiclesService.findBySellerId(sellerId);
    if (vehicles.length === 0) {
      return { error: 'Seller not found', statusCode: 404 };
    }
    const first = vehicles[0];
    return {
      seller: {
        id: first.seller.id,
        name: first.seller.name,
        type: first.seller.type,
        rating: first.seller.rating,
        vehicleCount: vehicles.length,
      },
      vehicles,
    };
  }
}
