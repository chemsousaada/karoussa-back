import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private bookingsRepo: Repository<Booking>,
    private usersService: UsersService,
  ) {}

  async getById(id: string): Promise<Booking> {
    const booking = await this.bookingsRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  /** Get all booked/pending date ranges for a vehicle */
  async getVehicleDates(vehicleId: string): Promise<{ startDate: string; endDate: string; status: string }[]> {
    const bookings = await this.bookingsRepo.find({
      where: {
        vehicleId,
        status: In(['pending', 'accepted']),
      },
    });
    return bookings.map(b => ({ startDate: b.startDate, endDate: b.endDate, status: b.status }));
  }

  /** Create a new booking request */
  async createBooking(
    userId: string,
    data: {
      vehicleId: string;
      vehicleName: string;
      vehicleImage?: string;
      vehicleLocation?: string;
      pricePerDay: number;
      agencyUserId?: string;
      startDate: string;
      endDate: string;
      userMessage?: string;
    },
  ): Promise<Booking> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Check for date conflicts
    const existing = await this.bookingsRepo.find({
      where: { vehicleId: data.vehicleId, status: In(['pending', 'accepted']) },
    });

    for (const b of existing) {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      const newStart = new Date(data.startDate);
      const newEnd = new Date(data.endDate);
      if (newStart <= bEnd && newEnd >= bStart) {
        throw new BadRequestException('These dates are already booked or pending');
      }
    }

    // Check if same user already has a booking for these dates
    const userConflict = await this.bookingsRepo.find({
      where: { vehicleId: data.vehicleId, userId, status: In(['pending', 'accepted']) },
    });
    for (const b of userConflict) {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      const newStart = new Date(data.startDate);
      const newEnd = new Date(data.endDate);
      if (newStart <= bEnd && newEnd >= bStart) {
        throw new BadRequestException('You already have a booking for these dates');
      }
    }

    const booking = this.bookingsRepo.create({
      vehicleId: data.vehicleId,
      vehicleName: data.vehicleName,
      vehicleImage: data.vehicleImage,
      vehicleLocation: data.vehicleLocation,
      pricePerDay: data.pricePerDay,
      userId,
      userName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      userEmail: user.email,
      agencyUserId: data.agencyUserId || null,
      startDate: data.startDate,
      endDate: data.endDate,
      userMessage: data.userMessage,
      status: 'pending',
    });

    const saved = await this.bookingsRepo.save(booking);

    // Notify rental agency users about the new booking request
    // Find all rental agency users
    const newBookingMsg = JSON.stringify({ key: 'notif_new_booking', params: { userName: booking.userName, vehicleName: data.vehicleName, startDate: data.startDate, endDate: data.endDate }, text: `${booking.userName} has requested to book ${data.vehicleName} from ${data.startDate} to ${data.endDate}` });
    if (data.agencyUserId) {
      await this.usersService.createNotification(
        data.agencyUserId,
        'notif_new_booking_subject',
        newBookingMsg,
        '/account/my-booking-requests',
      );
    } else {
      // Broadcast to all rental agency users
      const allUsers = await this.usersService.findAllRentalAgencies();
      for (const agencyUser of allUsers) {
        await this.usersService.createNotification(
          agencyUser.id,
          'notif_new_booking_subject',
          newBookingMsg,
          '/account/my-booking-requests',
        );
      }
    }

    return saved;
  }

  /** Get all bookings made by the current user (my reservations) */
  async getMyReservations(userId: string): Promise<Booking[]> {
    return this.bookingsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Get all booking requests received (for rental agencies) */
  async getBookingRequests(_agencyUserId: string): Promise<Booking[]> {
    // Return all bookings (since agency manages all mock vehicles)
    return this.bookingsRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  /** Accept a booking */
  async acceptBooking(bookingId: string, _agencyUserId: string, response?: string): Promise<Booking> {
    const booking = await this.bookingsRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'pending') throw new BadRequestException('Booking is not pending');

    booking.status = 'accepted';
    booking.agencyResponse = response;
    const saved = await this.bookingsRepo.save(booking);

    // Notify user
    await this.usersService.createNotification(
      booking.userId,
      'notif_booking_accepted_subject',
      JSON.stringify({ key: 'notif_booking_accepted', params: { vehicleName: booking.vehicleName, startDate: booking.startDate, endDate: booking.endDate, response: response ?? '' }, text: `Your booking for ${booking.vehicleName} (${booking.startDate} – ${booking.endDate}) has been accepted.${response ? ' Message: ' + response : ''}` }),
      '/account/my-reservations',
    );

    return saved;
  }

  /** Deny a booking */
  async denyBooking(bookingId: string, _agencyUserId: string, response?: string): Promise<Booking> {
    const booking = await this.bookingsRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'pending') throw new BadRequestException('Booking is not pending');

    booking.status = 'denied';
    booking.agencyResponse = response;
    const saved = await this.bookingsRepo.save(booking);

    // Notify user
    await this.usersService.createNotification(
      booking.userId,
      'notif_booking_denied_subject',
      JSON.stringify({ key: 'notif_booking_denied', params: { vehicleName: booking.vehicleName, startDate: booking.startDate, endDate: booking.endDate, response: response ?? '' }, text: `Your booking for ${booking.vehicleName} (${booking.startDate} – ${booking.endDate}) was not accepted.${response ? ' Reason: ' + response : ''}` }),
      '/account/my-reservations',
    );

    return saved;
  }

  /** Cancel a booking (by the user who made it) */
  async cancelBooking(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.bookingsRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenException('Not your booking');
    if (!['pending', 'accepted'].includes(booking.status)) {
      throw new BadRequestException('Cannot cancel this booking');
    }

    booking.status = 'cancelled';
    return this.bookingsRepo.save(booking);
  }
}
