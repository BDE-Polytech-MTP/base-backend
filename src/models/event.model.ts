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

    /** UUID of the BDE which organize the event */
    bdeUUID: string;

    /** Is this event a draft */
    isDraft: boolean;

}
