import {Event} from '../models';

/**
 * Events access service.
 */
export interface EventsService {

    /**
     * Creates the given event.
     * 
     * @param event The event to create
     */
    create(event: Event): Promise<Event>;

    /**
     * Deletes the event with the given UUID.
     * 
     * @param uuid The event UUID
     */
    delete(uuid: string): Promise<Event>;

    /**
     * Finds the event with the given UUID.
     * 
     * @param uuid The event UUID
     */
    findByUUID(uuid: string): Promise<Event>;

    /**
     * Finds all events organized by the BDE with the given UUID.
     * 
     * @param bdeUUID The UUID of an existing BDE
     */
    findByBDE(bdeUUID: string): Promise<Event[]>;

    /**
     * Finds all events.
     */
    findAll(): Promise<Event[]>

}