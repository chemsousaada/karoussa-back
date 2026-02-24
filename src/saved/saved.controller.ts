import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SavedService } from './saved.service';

@Controller('api/mock/saved')
export class SavedController {
  constructor(private savedService: SavedService) {}

  @Get('adverts')
  @UseGuards(JwtAuthGuard)
  async getSavedAdverts(@Request() req) {
    return this.savedService.getSavedAdverts(req.user.userId);
  }

  @Post('adverts')
  @UseGuards(JwtAuthGuard)
  async addSavedAdvert(@Request() req, @Body() body: { vehicleId: string }) {
    return this.savedService.addSavedAdvert(req.user.userId, body.vehicleId);
  }

  @Delete('adverts/:id')
  @UseGuards(JwtAuthGuard)
  async removeSavedAdvert(@Request() req, @Param('id') id: string) {
    return this.savedService.removeSavedAdvert(req.user.userId, id);
  }

  @Get('searches')
  @UseGuards(JwtAuthGuard)
  async getSavedSearches(@Request() req) {
    return this.savedService.getSavedSearches(req.user.userId);
  }

  @Post('searches')
  @UseGuards(JwtAuthGuard)
  async addSavedSearch(@Request() req, @Body() body: { name: string; filters: any }) {
    return this.savedService.addSavedSearch(req.user.userId, body.name, body.filters);
  }

  @Delete('searches/:id')
  @UseGuards(JwtAuthGuard)
  async removeSavedSearch(@Request() req, @Param('id') id: string) {
    return this.savedService.removeSavedSearch(req.user.userId, id);
  }
}
