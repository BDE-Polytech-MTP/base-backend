import {Event} from '../models';

/**
 * Types of error that can the thrown by EventsService.
 */
export enum EventsErrorType {
    INTERNAL,
    EVENT_NOT_EXISTS,
    BDE_UUID_NOT_EXISTS
}

/**
 * Events access service.
 */
export interface EventsService {

    /**
     * Creates the given event.
     * 
     * @param event The event to create
     * 
     * @returns the event if creation is a success
     * @throws INTERNAL error in any other case
     */
    create(event: Event): Promise<Event>;

    /**
     * Updates the given event.
     * 
     * @param event The new value for the event
     * 
     * @returns the updated event if the update is a success
     * @throws EVENT_NOT_EXISTS if no event with the given UUID exists
     * @throws INTERNAL error in any other case
     */
    update(event: Event): Promise<Event>;

    /**
     * Deletes the event with the given UUID.
     * 
     * @param uuid The event UUID
     * 
     * @returns the deleted event is deletion is a success
     * @throws EVENT_NOT_EXISTS error if the no event with the given UUID can be found
     * @throws INTERNAL error in any other case
     */
    delete(uuid: string): Promise<Event>;

    /**
     * Finds the event with the given UUID.
     * 
     * @param uuid The event UUID
     * 
     * @returns the event with the given UUID if found
     * @throws EVENT_NOT_EXISTS error if no event with the given UUID can be found
     * @throws INTERNAL error in any other case
     */
    findByUUID(uuid: string): Promise<Event>;

    /**
     * Finds all events organized by the BDE with the given UUID.
     * 
     * Note: this function does not need to ensure a BDE with the given UUID exists, in the case of an unknown BDE UUID, just return an
     * empty array
     * 
     * @param bdeUUID The UUID of an existing BDE
     * 
     * @returns an array of events if searched is a success (empty array is considered as a success if BDE didn't organize any event)
     * @throws INTERNAL error in any other case
     */
    findByBDE(bdeUUID: string): Promise<Event[]>;

    /**
     * Finds all events.
     * 
     * @returns an array of event if fetching is a success
     * @throws INTERNAL error in any other case
     */
    findAll(): Promise<Event[]>

}

/**
 * An error class that allows to specify the type of error encountered.
 */
export class EventsServiceError extends Error {

    constructor(message: string, public type: EventsErrorType) {
        super(message);
    }

}