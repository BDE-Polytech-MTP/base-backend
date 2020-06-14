import { DateTime } from 'luxon';

export interface Event {

    /** Event unique identifier */
    uuid: string;

    /** Event display name */
    name: string;

    /** Date at which users can begin to book (optional) */
    bookingStart?: DateTime;

    /** Date at which users must not book anymore (optional)  */
    bookingEnd?: DateTime;

    /** Date at which event take place (optional) (indicative) */
    eventDate?: DateTime;

    /** Event booking state */
    eventState: EventState;

    /** UUID of the BDE which organize the event */
    bdeUUID: string;

}

export enum EventState {
    /** The event isn't opened yet */
    WAIT_BOOKING_TO_OPEN = 0,
    /** The event is opened */
    ACCEPT_BOOKING_REQUESTS = 1,
    /** The event is closed */
    BOOKING_REQUESTS_CLOSED = 2,
}