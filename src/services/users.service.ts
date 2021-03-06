import { UserRequest } from "../models/user-request.model";
import { User, UnregisteredUser } from "../models/user.model";

/**
 * Types of error that can the thrown by UsersService.
 */
export enum UsersErrorType {
    INTERNAL,
    USER_ALREADY_EXISTS,
    USER_NOT_EXISTS,
    BDE_NOT_EXISTS,
    INVALID_SPECIALTY,
}

/**
 * Users access service.
 */
export interface UsersService {

    /**
     * Creates the given user.
     * 
     * @return the given unregistered user if creation is a success.
     * @throws USER_ALREADY_EXISTS if a user with the given UUID or the given email already exists
     * @throws BDE_NOT_EXISTS if no BDE with the given UUID exists
     * @throws INTERNAL error in any other case
     * 
     * @param user The user to create
     */
    create(user: UnregisteredUser): Promise<UnregisteredUser>;

    /**
     * Adds the given data to the request of accounts.
     * 
     * @return the given user request if request is a success
     * @throws USER_ALREADY_EXISTS if an user with the given email already exists
     * @throws BDE_NOT_EXISTS if no BDE with the given UUID exists
     * @throws INVALID_SPECIALTY if the given specialty do not exist
     * @throws INTERNAL otherwise
     * 
     * @param user The user request
     */
    register(user: UserRequest): Promise<UserRequest>;

    /**
     * Finishes to register the given user.
     * 
     * @return the given user if registration closure is a success
     * @throws USER_NOT_EXISTS error if no user with the given UUID exists
     * @throws INVALID_SPECIALTY error if the given specialty isn't available in the attached BDE
     * @throws INTERNAL error in any other case
     * 
     * @param user The user to end registration of
     */
    finishRegistration(user: User): Promise<User>;

    /**
     * Finds the unregistered user with the given UUID.
     * 
     * @return the unregistered user with the given UUID if it exists
     * @throws USER_NOT_EXISTS error if no user with the given UUID exists
     * @throws INTERNAL error in any other case
     * 
     * @param uuid The user UUID
     */
    findUnregisteredByUUID(uuid: string): Promise<UnregisteredUser>;

    /**
     * Finds the registered or unregistered user with the given UUID.
     * 
     * @returns the user with the given UUID if it exists
     * @throws USER_NOT_EXISTS error if no user with the given UUID exists
     * @throws INTERNAL error in any other case
     * 
     * @param uuid The user UUID
     */
    findByUUID(uuid: string): Promise<User | UnregisteredUser>;

    /**
     * Finds the user with the given email.
     * 
     * @returns the user with the given email if it exists
     * @throws USER_NOT_EXISTS if no user with the given email exists
     * @throws INTERNAL error in any other case
     * 
     * @param email The user email
     */
    findByEmail(email: string): Promise<User>;

    /**
     * Deletes the user with the given UUID.
     * 
     * @returns if the user with the given UUID have been deleted
     * @throws USER_NOT_EXISTS if no user with the given UUID exists
     * @throws INTERNAL in any other case
     * 
     * @param uuid The user UUID
     */
    delete(uuid: string): Promise<void>;

    /**
     * Finds all users.
     * 
     * @param bdeUUID if provided, only fetch user from the this BDE
     * 
     * @throws BDE_NOT_EXISTS if a BDE uuid is provided and no BDE with the given UUID exists
     * @throws INTERNAL if any other case
     */
    findAll(bdeUUID?: string): Promise<(User | UnregisteredUser)[]>;

    /**
     * Find all account requests.
     * 
     * @param bdeUUID The UUID of the BDE to fetch requests for
     * 
     * @throws BDE_NOT_EXISTS if a BDE uuid is provided and no BDE with the given UUID exists
     * @throws INTERNAL otherwise
     */
    findAllRequest(bdeUUID: string): Promise<UserRequest[]>;

    /**
     * Validates or refuses an account request.
     * 
     * @param email The email to validate
     * @param bdeUUID The UUID of the BDE the user requests belongs to
     * @param accepted Whether are not the request got accepted
     * 
     * @throws USER_NOT_EXISTS if no user can be found
     * @throws INTERNAL otherwise
     */
    processUserRequest(email: string, bdeUUID: string, accepted: boolean): Promise<UnregisteredUser | null>;

}

/**
 * An error class that allows to specify the type of error encountered.
 */
export class UsersServiceError extends Error {

    constructor(message: string, public type: UsersErrorType) {
        super(message);
    }

}