import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingsService } from './bookings.service';
import { ConversationsService } from '../conversations/conversations.service';
import { UsersService } from '../users/users.service';

@Controller('api/mock/bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly conversationsService: ConversationsService,
    private readonly usersService: UsersService,
  ) {}

  /** Public: get booked/pending dates for a vehicle */
  @Get('vehicle/:vehicleId/dates')
  getVehicleDates(@Param('vehicleId') vehicleId: string) {
    return this.bookingsService.getVehicleDates(vehicleId);
  }

  /** Create a booking request */
  @Post()
  @UseGuards(JwtAuthGuard)
  createBooking(@Request() req, @Body() body: {
    vehicleId: string;
    vehicleName: string;
    vehicleImage?: string;
    vehicleLocation?: string;
    pricePerDay: number;
    agencyUserId?: string;
    startDate: string;
    endDate: string;
    userMessage?: string;
  }) {
    return this.bookingsService.createBooking(req.user.userId, body);
  }

  /** Get my reservations (bookings I sent) */
  @Get('my-reservations')
  @UseGuards(JwtAuthGuard)
  getMyReservations(@Request() req) {
    return this.bookingsService.getMyReservations(req.user.userId);
  }

  /** Get booking requests received (rental agencies) */
  @Get('requests')
  @UseGuards(JwtAuthGuard)
  getBookingRequests(@Request() req) {
    return this.bookingsService.getBookingRequests(req.user.userId);
  }

  /** Accept a booking */
  @Put(':id/accept')
  @UseGuards(JwtAuthGuard)
  acceptBooking(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { response?: string },
  ) {
    return this.bookingsService.acceptBooking(id, req.user.userId, body.response);
  }

  /** Deny a booking */
  @Put(':id/deny')
  @UseGuards(JwtAuthGuard)
  denyBooking(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { response?: string },
  ) {
    return this.bookingsService.denyBooking(id, req.user.userId, body.response);
  }

  /** Cancel a booking */
  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelBooking(@Param('id') id: string, @Request() req) {
    return this.bookingsService.cancelBooking(id, req.user.userId);
  }

  /** Open or find a chat conversation for a booking */
  @Post(':id/open-chat')
  @UseGuards(JwtAuthGuard)
  async openChat(@Param('id') id: string, @Request() req) {
    const booking = await this.bookingsService.getById(id);
    const agencyUser = await this.usersService.findById(req.user.userId);
    const conv = await this.conversationsService.createOrFindForBooking(
      booking.userId,
      `booking-${booking.vehicleId}`,
      req.user.userId,
      agencyUser.name || agencyUser.email,
      booking.vehicleName,
      booking.vehicleImage ?? null,
    );
    return { conversationId: conv.id };
  }
}
