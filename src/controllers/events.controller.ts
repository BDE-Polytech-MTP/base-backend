import { EventsService, AuthenticationService, JWTClaims } from '../services';
import { ValidatorBuilder } from '../validation';
import { Event, EventState } from '../models';
import { DateTime } from 'luxon';
import { v4 as uuid } from 'uuid';
import * as httpCode from '../utils/http-code';
import { canManageEvents } from '../utils/permissions';

export class EventsController {

    private static EVENT_VALIDATOR = ValidatorBuilder
                                        .new<{ name: string, bde: string, isDraft: boolean, bookingStart?: string, bookingEnd?: string, eventDate?: string }>()
                                        .requires('name').toBeString().withMinLength(1).withMaxLength(200)
                                        .requires('bde').toBeString().withMinLength(1)
                                        .requires('isDraft').toBeBoolean()
                                        .optional('bookingStart').toBeDateTime()
                                        .optional('bookingEnd').toBeDateTime()
                                        .optional('eventDate').toBeDateTime()
                                        .build();

    constructor(private eventsService: EventsService, private authService: AuthenticationService) {}

    /**
     * Handles a request to aims to create an event.
     * 
     * @param body The request body
     * @param token The JWT to identify user
     */
    async create(body: object | null, token?: string): Promise<httpCode.Response> {

        /* No user token were given, we return an unauthorized error */
        if (!token) {
            return httpCode.unauthorized('You must be connected.');
        }

        /* Try to authenticate the user from the given token */
        let claims: JWTClaims;
        try {
            claims = await this.authService.verifyToken(token);
        } catch (_) {
            return httpCode.unauthorized('The given token is invalid.');
        }

        /* Validate request body */
        const result = EventsController.EVENT_VALIDATOR.validate(body);
        if (!result.valid) {
            return httpCode.badRequest(result.error.message);
        }

        let event: Event = {
            uuid: uuid(),
            bdeUUID: result.value.bde,
            name: result.value.name,
            eventState: EventState.WAIT_BOOKING_TO_OPEN,
            isDraft: result.value.isDraft,
        };

        if (result.value.bookingStart) {
            event.bookingStart = DateTime.fromISO(result.value.bookingStart);
        }

        if (result.value.bookingEnd) {
            event.bookingEnd = DateTime.fromISO(result.value.bookingEnd);
        }

        if (result.value.eventDate) {
            event.eventDate = DateTime.fromISO(result.value.eventDate);
        }

        /* If bookingStart and bookingEnd are specified, we check if bookingStart if before bookingEnd */
        if (event.bookingStart && event.bookingEnd && event.bookingEnd <= event.bookingStart) {
            return httpCode.badRequest('Booking end date must come (strictly) after booking beginning date.');
        }

        /* Checking user permission */
        if (!canManageEvents(claims, result.value.bde)) {
            return httpCode.forbidden('You do not have the permission to create this event.');
        }

        try {
            event = await this.eventsService.create(event)

            return httpCode.created(event);
        } catch (_) {
            return httpCode.internalServerError('Unable to create an event. Contact an administrator or retry later.');
        }

    }

}