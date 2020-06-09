import { User, UnregisteredUser } from "../models/user.model";

/**
 * Users access service.
 */
export interface UsersService {

    /**
     * Creates the given user.
     * 
     * @param user The user to create
     */
    create(user: UnregisteredUser): Promise<UnregisteredUser>;

    /**
     * Finishes to register the given user.
     * 
     * @param user The user end registration of
     */
    finishedRegistration(user: User): Promise<User>;

    /**
     * Finds the unregistered user with the given UUID.
     * 
     * @param uuid The user UUID
     */
    findUnregisteredByUUID(uuid: string): Promise<UnregisteredUser>;

    /**
     * Finds the user with the given UUID.
     * 
     * @param uuid The user UUID
     */
    findByUUID(uuid: string): Promise<User>;

    /**
     * Finds the user with the given email.
     * 
     * @param email The user email
     */
    findByEmail(email: string): Promise<User>;

    /**
     * Deletes the user with the given UUID.
     * 
     * @param uuid The user UUID
     */
    delete(uuid: string): Promise<void>;

}