import { Booking } from "../models/booking.model";

/**
 * Bookings access service
 */
export interface BookingsService {

    /**
     * Creates the given booking.
     * 
     * @param booking The booking to create
     */
    create(booking: Booking): Promise<Booking>;

    /**
     * Finds all bookings for the event with the given UUID.
     * 
     * @param eventUUID The UUID of the event to find bookings for
     */
    findBookingsForEvent(eventUUID: string): Promise<Booking[]>;

    /**
     * Finds all bookings of the user with the given UUID.
     * 
     * @param userUUID The UUID of the user to find bookings of
     */
    findBookingsForUser(userUUID: string): Promise<Booking[]>;

}