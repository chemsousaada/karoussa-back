import {
  Controller, Get, Post, Patch, Param, Body, Req,
  UseGuards, UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const storage = diskStorage({
  destination: './uploads/conversations',
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extname(file.originalname));
  },
});

@Controller('api/mock/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly svc: ConversationsService) {}

  /** GET /api/mock/conversations – list current user's conversations */
  @Get()
  list(@Req() req: any) {
    return this.svc.getConversations(req.user.userId);
  }

  /** GET /api/mock/conversations/unread-count */
  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.svc.getUnreadCount(req.user.userId);
  }

  /** GET /api/mock/conversations/:id */
  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.svc.getConversation(id, req.user.userId);
  }

  /** POST /api/mock/conversations – start or find conversation */
  @Post()
  create(
    @Body() body: {
      vehicleId: string;
      sellerId: string;
      sellerName: string;
      vehicleTitle: string;
      vehicleImage: string;
    },
    @Req() req: any,
  ) {
    return this.svc.createOrFind(
      req.user.userId,
      body.vehicleId,
      body.sellerId,
      body.sellerName,
      body.vehicleTitle,
      body.vehicleImage,
    );
  }

  /** POST /api/mock/conversations/:id/messages – send a message (with optional file uploads) */
  @Post(':id/messages')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage,
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async send(
    @Param('id') id: string,
    @Body() body: { text?: string },
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    const attachments = (files ?? []).map(f => ({
      type: f.mimetype.startsWith('image/')
        ? 'image'
        : f.mimetype.startsWith('video/')
        ? 'video'
        : 'pdf',
      url: `/uploads/conversations/${f.filename}`,
      name: f.originalname,
    }));

    return this.svc.sendMessage(id, req.user.userId, body.text ?? '', attachments);
  }

  /** PATCH /api/mock/conversations/:id/read */
  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: any) {
    return this.svc.markAsRead(id, req.user.userId);
  }

  /** POST /api/mock/conversations/:id/report */
  @Post(':id/report')
  report(
    @Param('id') id: string,
    @Body() body: { reason: string; details?: string },
    @Req() req: any,
  ) {
    return this.svc.createReport(id, req.user.userId, body.reason, body.details ?? '');
  }
}
