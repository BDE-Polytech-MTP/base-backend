import { Booking, Event } from "../models";

export enum BookingsErrorType {
    EVENT_NOT_EXISTS,
    USER_NOT_EXISTS,
    BOOKING_NOT_EXISTS,
    BOOKING_ALREADY_EXISTS,
    INTERNAL
};

export interface PartialUser {
    userUUID: string;
    firstname: string;
    lastname: string;
    specialtyName: string;
    specialtyYear: number;
}

/**
 * Bookings access service
 */
export interface BookingsService {

    /**
     * Creates the given booking.
     * 
     * @param booking The booking to create
     * 
     * @throws BOOKING_ALREADY_EXISTS if a booking for the given event by the given user already exists
     * @throws EVENT_NOT_EXISTS if no event with the given UUID exists
     * @throws USER_NOT_EXISTS if no user with the given UUID exists
     * @throws INTERNAL in any other case
     */
    create(booking: Booking): Promise<Booking>;

    /**
     * Finds the booking of the user with the given UUID for the event with the given UUID.
     * 
     * @param userUUID The user UUID
     * @param eventUUID The event UUID
     * 
     * @throws BOOKING_NOT_EXISTS if no booking matching the request exists
     * @throws INTERNAL in any other case
     */
    findOne(userUUID: string, eventUUID: string): Promise<Booking & Event & PartialUser>;

    /**
     * Finds all bookings for the event with the given UUID.
     * 
     * @param eventUUID The UUID of the event to find bookings for
     */
    findBookingsForEvent(eventUUID: string): Promise<(Booking & Event & PartialUser)[]>;

    /**
     * Finds all bookings of the user with the given UUID.
     * 
     * @param userUUID The UUID of the user to find bookings of
     */
    findBookingsForUser(userUUID: string): Promise<(Booking & Event & PartialUser)[]>;

}

/**
 * An error class that allows to specify the type of error encountered.
 */
export class BookingsServiceError extends Error {

    constructor(message: string, public type: BookingsErrorType) {
        super(message);
    }

}