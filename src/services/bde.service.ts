import { BDE } from "../models/bde.model";

/**
 * Types of error that can be thrown by BDEService.
 */
export enum BDEErrorType {
    INTERNAL,
    BDE_ALREADY_EXISTS,
    BDE_NOT_EXISTS,
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
     * @throws INTERNAL error in any other case.
     * 
     * @param bde The BDE to create
     */
    create(bde: BDE): Promise<BDE>;
    
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

}

/**
 * An error class that allows to sepcify the type of error encountered.
 */
export class BDEServiceError extends Error {

    constructor(message: string, public type: BDEErrorType) {
        super(message);
    }

}