import { EventsService } from '../services';
import { ValidatorBuilder } from '../validation';
import { Event, EventState } from '../models';
import { DateTime } from 'luxon';
import { v4 as uuid } from 'uuid';
import * as httpCode from '../utils/http-code';

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

    constructor(private eventsService: EventsService) {}

    /**
     * Handles a request to aims to create an event.
     * 
     * @param body The request body
     */
    async create(body: object | null): Promise<httpCode.Response> {
        // TODO: Check authorization
        const result = EventsController.EVENT_VALIDATOR.validate(body);
        if (!result.valid) {
            return httpCode.badRequest(result.error.message);
        }

        const event: Event = {
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

        if (event.bookingStart && event.bookingEnd && event.bookingEnd <= event.bookingStart) {
            return httpCode.badRequest('Booking end date must come (strictly) after booking beginning date.');
        }

        try {
            await this.eventsService.create(event)

            return httpCode.created(event);
        } catch (_) {
            return httpCode.internalServerError('Unable to create an event. Contact an administrator or retry later.');
        }

    }

}