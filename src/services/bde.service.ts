import { BDE } from "../models/bde.model";

/**
 * BDE access service.
 */
export interface BDEService {

    /**
     * Create the given BDE.
     * 
     * @param bde The BDE to create
     */
    create(bde: BDE): Promise<BDE>;
    
    /**
     * Deletes the BDE with the given UUID.
     * 
     * @param uuid The BDE uuid
     */
    delete(uuid: string): Promise<BDE>;

}