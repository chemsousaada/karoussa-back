import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { ContactService } from './contact.service';

@Controller('api/mock/contact')
export class ContactController {
  constructor(
    private contactService: ContactService,
    private usersService: UsersService,
  ) {}

  @Post()
  async submitContact(@Body() body: any) {
    return this.contactService.submitContact(body);
  }

  @Post('complaint')
  async submitComplaint(@Body() body: any) {
    return this.contactService.submitComplaint(body);
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  private async requireAdmin(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user.isAdmin) throw new ForbiddenException('Admin access required');
  }

  /** GET /api/mock/contact/admin — list all contact submissions */
  @Get('admin')
  @UseGuards(JwtAuthGuard)
  async listContacts(@Request() req, @Query() query: any) {
    await this.requireAdmin(req.user.userId);
    const resolved = query.resolved === 'true' ? true : query.resolved === 'false' ? false : undefined;
    return this.contactService.getAdminContacts({
      type:     query.type,
      resolved,
      page:     parseInt(query.page)  || 1,
      limit:    parseInt(query.limit) || 20,
    });
  }

  /** PATCH /api/mock/contact/admin/:id/resolve — mark as resolved */
  @Patch('admin/:id/resolve')
  @UseGuards(JwtAuthGuard)
  async resolveContact(@Request() req, @Param('id') id: string) {
    await this.requireAdmin(req.user.userId);
    return this.contactService.resolveContact(id);
  }

  /** DELETE /api/mock/contact/admin/:id — delete a contact submission */
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard)
  async deleteContact(@Request() req, @Param('id') id: string) {
    await this.requireAdmin(req.user.userId);
    return this.contactService.deleteContact(id);
  }
}
