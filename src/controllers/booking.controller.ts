import { BookingsService, AuthenticationService, LoggingService, JWTClaims, EventsService, EventsErrorType, BookingsErrorType, EventsServiceError } from "../services";
import * as httpCode from '../utils/http-code';
import { ValidatorBuilder } from '../validation';
import { Booking, Event } from "../models";
import { canManageBooking } from "../utils/permissions";

export class BookingsController  {

    private static BOOKING_VALIDATOR = ValidatorBuilder.new<{ user: string, event: string }>()
                                                        .requires('user').toBeString().withMinLength(1).withMaxLength(36)
                                                        .requires('event').toBeString().withMinLength(1).withMaxLength(36)
                                                        .build();

    constructor(
        private bookingService: BookingsService,
        private eventsService: EventsService,
        private authService: AuthenticationService,
        private loggingService: LoggingService
    ) {}

    /**
     * Handles a request that aims to create a booking.
     * This method always resolves.
     * 
     * @param body The request body
     * @param token The JWT token to identify user
     */
    async create(body: object | null, token?: string): Promise<httpCode.Response> {

        /* If no token were given, we can authenticate user  */
        if (!token) {
            return httpCode.unauthorized('You must authenticate.');
        }

        /* We try to decode given token to authenticate user */
        let jwtClaims: JWTClaims;
        try {
            jwtClaims = await this.authService.verifyToken(token);
        } catch (_) {
            return httpCode.unauthorized('The given token is invalid.');
        }

        /* Validating request body */
        const result = BookingsController.BOOKING_VALIDATOR.validate(body);
        if (!result.valid) {
            return httpCode.badRequest(result.error.message);
        }

        let booking: Booking = {
            eventUUID: result.value.event,
            userUUID: result.value.event,
        };

        /* Retrieving event */
        let event: Event;
        try {
            event = await this.eventsService.findByUUID(booking.eventUUID);
        } catch (e) {
            if (e.type === EventsErrorType.EVENT_NOT_EXISTS) {
                return httpCode.badRequest('Invalid event UUID specified.');
            }
            this.loggingService.error(e);
            return httpCode.internalServerError('Unable to create booking. Contact an adminstrator or retry later.');
        }

        /* Checking whether or not the user can create this booking */
        if (!canManageBooking(jwtClaims, { userUUID: booking.eventUUID, bdeUUID: event.bdeUUID })) {
            return httpCode.forbidden('You do not have the permission to create this booking.');
        }

        /* Creating the booking */
        try {
            booking = await this.bookingService.create(booking);
            return httpCode.created(booking);
        } catch (e) {
            if (e.type === BookingsErrorType.EVENT_NOT_EXISTS) {
                return httpCode.badRequest('Specified bde UUID is invalid.');
            } else if (e.type === BookingsErrorType.USER_NOT_EXISTS) {
                return httpCode.badRequest('Specified user UUID is invalid.');
            }
            this.loggingService.error(e);
            return httpCode.internalServerError('Unable to create booking. Contact an adminstrator or retry later.');
        }

    }

    /**
     * Handles a request that aims to retrieve a single booking.
     * This method always resolves.
     * 
     * @param eventUUID The event UUID the booking is for
     * @param userUUID The user UUID the bookign is from
     * @param token The JWT to authenticate user
     */
    async findOne(eventUUID: string, userUUID: string, token?: string): Promise<httpCode.Response> {

        /* If no token is given, we can't authenticate user */
        if (!token) {
            return httpCode.unauthorized('You must authenticate.');
        }

        /* Trying to authenticate user */
        let jwtClaims: JWTClaims;
        try {
            jwtClaims = await this.authService.verifyToken(token);
        } catch (_) {
            return httpCode.unauthorized('The given token is invalid.');
        }

        /* Fetching event related to the booking */
        let event: Event;
        try {
            event = await this.eventsService.findByUUID(eventUUID);
        } catch (e) {
            if (e.type === EventsErrorType.EVENT_NOT_EXISTS) {
                return httpCode.notFound('Event does not exists.');
            }
            this.loggingService.error(e);
            return httpCode.internalServerError('Can\'t retrieve booking. Contact an adminstrator or retry later.');
        }

        /* Check access permission */
        if (!canManageBooking(jwtClaims, { userUUID, bdeUUID: event.bdeUUID })) {
            return httpCode.forbidden('You do not have permission to fetch this booking.');
        }

        /* Retrieve booking */
        let booking: Booking;
        try {
            booking = await this.bookingService.findOne(userUUID, eventUUID);
            return httpCode.ok(booking);
        } catch (e) {
            if (e.type === BookingsErrorType.BOOKING_NOT_EXISTS) {
                return httpCode.notFound('This booking does not exist.');
            }
            this.loggingService.error(e);
            return httpCode.internalServerError('Unable to fecth booking. Contact an adminstrator or retry later.');
        }
    }

}