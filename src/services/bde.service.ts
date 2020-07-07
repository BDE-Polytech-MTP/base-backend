import { BDE, UnregisteredUser } from "../models";

/**
 * Types of error that can be thrown by BDEService.
 */
export enum BDEErrorType {
    INTERNAL,
    BDE_ALREADY_EXISTS,
    BDE_NOT_EXISTS,
    USER_ALREADY_EXISTS
}

/**
 * BDE access service.
 */
export interface BDEService {

    /**
     * Create the given BDE.
     * 
     * @return the given BDE if the creation is a success.
     * @throws BDE_ALREADY_EXISTS error if a BDE with the given UUID already exists.
     * @throws BDE_ALREADY_EXISTS error if a BDE with the given name already exists.
     * @throws USER_ALREADY_EXISTS error if an user with the given email or UUID already exists.
     * @throws INTERNAL error in any other case.
     * 
     * @param bde The BDE to create
     * @param owner The owner of of the BDE
     */
    create(bde: BDE, owner: UnregisteredUser): Promise<BDE>;
    
    /**
     * Deletes the BDE with the given UUID.
     * 
     * @return the deleted BDE if the deletion is a success.
     * @throws BDE_NOT_EXISTS error if no BDE with the given UUID exists.
     * @throws INTERNAL error in any other case.
     * 
     * @param uuid The BDE uuid
     */
    delete(uuid: string): Promise<BDE>;

    /**
     * List all known BDEs.
     * 
     * @return an array of all known BDEs.
     * @throws INTERNAL error if a problem occured.
     */
    listAll(): Promise<BDE[]>;

    /**
     * Finds the BDE with the given UUID.
     * 
     * @returns the bde with the given UUID.
     * @throws BDE_NOT_EXISTS error if no BDE with the given UUID exists.
     * @throws INTERNAL error in any other case.
     * 
     * @param uuid The BDE UUID
     */
    findByUUID(uuid: string): Promise<BDE>;

}

/**
 * An error class that allows to specify the type of error encountered.
 */
export class BDEServiceError extends Error {

    constructor(message: string, public type: BDEErrorType) {
        super(message);
    }

}