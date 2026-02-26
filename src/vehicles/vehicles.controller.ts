import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VehiclesService } from './vehicles.service';
import { UsersService } from '../users/users.service';

@Controller('api/mock')
export class VehiclesController {
  constructor(
    private vehiclesService: VehiclesService,
    private usersService: UsersService,
  ) {}

  @Get('search')
  async search(@Query() filters: any) {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    return this.vehiclesService.findAll(filters, page, limit);
  }

  @Get('vehicles/my')
  @UseGuards(JwtAuthGuard)
  async getMyVehicles(@Request() req) {
    return this.vehiclesService.findByUserId(req.user.userId);
  }

  @Get('vehicles/:id')
  async getVehicle(@Param('id') id: string) {
    return this.vehiclesService.findById(id);
  }

  @Post('vehicles')
  @UseGuards(JwtAuthGuard)
  async createVehicle(@Request() req, @Body() body: any) {
    const dbUser = await this.usersService.findById(req.user.userId);
    const sellerName = dbUser.userType === 'store'
      ? (dbUser.storeName || dbUser.name)
      : dbUser.name;
    const vehicleData = {
      ...body,
      userId: dbUser.id,
      sellerId: dbUser.id,
      sellerName: sellerName || dbUser.email,
      sellerType: dbUser.userType === 'store' ? 'dealer' : 'private',
    };
    return this.vehiclesService.create(vehicleData);
  }

  @Put('vehicles/:id')
  @UseGuards(JwtAuthGuard)
  async updateVehicle(@Param('id') id: string, @Body() body: any) {
    return this.vehiclesService.update(id, body);
  }

  @Delete('vehicles/:id')
  @UseGuards(JwtAuthGuard)
  async deleteVehicle(@Request() req, @Param('id') id: string) {
    return this.vehiclesService.delete(id, req.user.userId);
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
