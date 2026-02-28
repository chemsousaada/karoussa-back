import {
  Controller, Get, Put, Post, Delete, Body, Param,
  UseGuards, UseInterceptors, UploadedFile, Request, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

const profilePhotoStorage = diskStorage({
  destination: './uploads/profiles',
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extname(file.originalname));
  },
});

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

  // ── Profile photos ─────────────────────────────────────────────────────────

  /** POST /api/mock/users/me/photos — upload one profile photo (max 3, 5 MB each) */
  @Post('me/photos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: profilePhotoStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadPhoto(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const user = await this.usersService.getCurrentUser(req.user.userId);
    const photos = user.profilePhotos ?? [];
    if (photos.length >= 3) {
      await unlink(join(process.cwd(), 'uploads', 'profiles', file.filename)).catch(() => {});
      throw new BadRequestException('Maximum 3 profile photos allowed');
    }
    const url = `/uploads/profiles/${file.filename}`;
    const updated = await this.usersService.update(req.user.userId, {
      profilePhotos: [...photos, url],
    });
    const { password, ...safeUser } = updated as any;
    return safeUser;
  }

  /** DELETE /api/mock/users/me/photos/:index — remove a profile photo by index */
  @Delete('me/photos/:index')
  @UseGuards(JwtAuthGuard)
  async deletePhoto(@Request() req, @Param('index') index: string) {
    const user = await this.usersService.getCurrentUser(req.user.userId);
    const photos = [...(user.profilePhotos ?? [])];
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0 || idx >= photos.length) {
      throw new BadRequestException('Invalid photo index');
    }
    const filename = photos[idx].split('/').pop();
    await unlink(join(process.cwd(), 'uploads', 'profiles', filename)).catch(() => {});
    photos.splice(idx, 1);
    const updated = await this.usersService.update(req.user.userId, { profilePhotos: photos });
    const { password, ...safeUser } = updated as any;
    return safeUser;
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

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
