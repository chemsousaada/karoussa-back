import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
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

  @Post('vehicles/:id/view')
  @UseGuards(JwtAuthGuard)
  async recordView(@Param('id') id: string, @Request() req) {
    return this.vehiclesService.recordView(id, req.user.userId);
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

  @Put('admin/vehicles/:id/sponsor')
  @UseGuards(JwtAuthGuard)
  async adminSponsorVehicle(@Request() req, @Param('id') id: string, @Body() body: { duration: string }) {
    const caller = await this.usersService.findById(req.user.userId);
    if (!caller.isAdmin) throw new ForbiddenException('Admin access required');
    return this.vehiclesService.setSponsor(id, body.duration ?? '1 week');
  }

  @Get('sellers/:id')
  async getSeller(@Param('id') sellerId: string) {
    const vehicles = await this.vehiclesService.findBySellerId(sellerId);
    if (vehicles.length === 0) {
      return { error: 'Seller not found', statusCode: 404 };
    }
    const first = vehicles[0];
    let profilePhotos: string[] = [];
    let about: string | null = null;
    let storePhone1: string | null = null;
    let storePhone2: string | null = null;
    let storeWebsite: string | null = null;
    let storeAddress: string | null = null;
    let storeCity: string | null = null;
    let storeTown: string | null = null;
    let openingHours: Record<string, any> | null = null;
    let agencyAddresses: { street: string; city: string; town: string }[] = [];
    try {
      const user = await this.usersService.findById(sellerId);
      if (user) {
        profilePhotos = user.profilePhotos ?? [];
        about = user.about ?? null;
        storePhone1 = user.storePhone1 ?? null;
        storePhone2 = user.storePhone2 ?? null;
        storeWebsite = user.storeWebsite ?? null;
        storeAddress = user.storeAddress ?? null;
        storeCity = user.storeCity ?? null;
        storeTown = user.storeTown ?? null;
        openingHours = user.openingHours ?? null;
        agencyAddresses = user.agencyAddresses ?? [];
      }
    } catch {}
    return {
      seller: {
        id: first.seller.id,
        name: first.seller.name,
        type: first.seller.type,
        rating: first.seller.rating,
        vehicleCount: vehicles.length,
        profilePhotos,
        about,
        storePhone1,
        storePhone2,
        storeWebsite,
        storeAddress,
        storeCity,
        storeTown,
        openingHours,
        agencyAddresses,
      },
      vehicles,
    };
  }
}
