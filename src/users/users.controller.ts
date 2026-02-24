import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('api/mock/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req) {
    const user = await this.usersService.getCurrentUser(req.user.userId);
    const { password, ...safeUser } = user as any;
    return safeUser;
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() updateData: any) {
    const user = await this.usersService.update(req.user.userId, updateData);
    const { password, ...safeUser } = user as any;
    return safeUser;
  }

  @Get('me/subscriptions')
  @UseGuards(JwtAuthGuard)
  async getSubscriptions(@Request() req) {
    const user = await this.usersService.getCurrentUser(req.user.userId);
    return {
      plan: user.subscriptionPlan || 'free',
      expiresAt: user.subscriptionExpiresAt || null,
      emailNotifications: {
        newListings: user.notifyNewListings,
        savedSearches: user.notifySavedSearches,
        messages: user.notifyMessages,
        newsletter: user.notifyNewsletter,
      },
    };
  }

  @Put('me/subscriptions')
  @UseGuards(JwtAuthGuard)
  async updateSubscriptions(@Request() req, @Body() data: any) {
    const updateData: any = {};
    if (data.plan !== undefined) updateData.subscriptionPlan = data.plan;
    if (data.emailNotifications) {
      if (data.emailNotifications.newListings !== undefined)
        updateData.notifyNewListings = data.emailNotifications.newListings;
      if (data.emailNotifications.savedSearches !== undefined)
        updateData.notifySavedSearches = data.emailNotifications.savedSearches;
      if (data.emailNotifications.messages !== undefined)
        updateData.notifyMessages = data.emailNotifications.messages;
      if (data.emailNotifications.newsletter !== undefined)
        updateData.notifyNewsletter = data.emailNotifications.newsletter;
    }
    const user = await this.usersService.update(req.user.userId, updateData);
    return {
      plan: user.subscriptionPlan || 'free',
      expiresAt: user.subscriptionExpiresAt || null,
      emailNotifications: {
        newListings: user.notifyNewListings,
        savedSearches: user.notifySavedSearches,
        messages: user.notifyMessages,
        newsletter: user.notifyNewsletter,
      },
    };
  }
}
