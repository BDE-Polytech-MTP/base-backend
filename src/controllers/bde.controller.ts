import { BDEService, BDEErrorType } from "../services";
import { ValidatorBuilder } from '../validation'
import { BDE } from "../models";
import { v4 as uuid } from 'uuid';
import * as httpCode from '../utils/http-code'; 

export class BDEController {

    private static BDE_VALIDATOR = ValidatorBuilder.new<{ name: string, specialties: { name: string, minYear: number, maxYear: number}[] }>()
                                    .requires("name").toBeString().withMinLength(1).withMaxLength(30)
                                    .requires('specialties').toBeArray().withMinLength(1).withEachElementValidating(
                                        ValidatorBuilder.new()
                                            .requires('name').toBeString().withMinLength(2)
                                            .requires('minYear').toBeInteger().withMinValue(1).withMaxValue(5)
                                            .requires('maxYear').toBeInteger().withMinValue(1).withMaxValue(5)
                                            .build()
                                    ).build();

    constructor(private bdeService: BDEService) {}

    /**
     * Handles a BDE creation request.
     * This method always resolves.
     * 
     * @param requestBody The received request body
     */
    async create(requestBody: object | null): Promise<httpCode.Response> {
        // TODO: Check authorization
        let result = BDEController.BDE_VALIDATOR.validate(requestBody);
        if (!result.valid) {
            return httpCode.badRequest(result.error.message);
        }

        let bdeObject: BDE = {
            name: result.value.name,
            specialties: result.value.specialties.map((spe) => ({ name: spe.name, minYear: spe.minYear, maxYear: spe.maxYear })),
            uuid: uuid(),
        };

        if (bdeObject.specialties.some((spe) => spe.minYear > spe.maxYear)) {
            return httpCode.badRequest('Expected specialty minYear to be lower than or equal to specialty maxYear');
        }

        try {
            const bde = await this.bdeService.create(bdeObject);
            return httpCode.created(bde);
        } catch (e) {
            if (e.type === BDEErrorType.BDE_ALREADY_EXISTS) {
                /*
                 * If a BDE creation request fails for duplicate, it's considered as request error.
                 * The given BDE name is certainly a duplicate. An other reason to fail could be a duplicated UUID but we consider
                 * this possibility to be highly unlikely ; espcially on a low key-space as BDE one.
                 */
                return httpCode.badRequest(e.message);
            } else {
                return httpCode.internalServerError('Unable to create a BDE. Contact an administrator.');
            }
        }
    }

    /**
     * Handles a request to aims to list all known BDEs.
     * This method always resolves.
     */
    async listAll(): Promise<httpCode.Response> {
        try {
            let bdes = await this.bdeService.listAll();
            return httpCode.ok(bdes);
        } catch (e) {
            return httpCode.internalServerError('Unable to fetch all BDEs. Contact an administrator or retry later.');
        }
    }

    /**
     * Handles a BDE data fetching request on the BDE with the given UUID.
     * This method always resolves.
     * 
     * @param uuid The BDE UUID
     */
    async getBDE(uuid: string): Promise<httpCode.Response> {
        if (uuid.length === 0) {
            return httpCode.badRequest('Unexpected empty uuid.');
        }

        try {
            const bde = await this.bdeService.findByUUID(uuid);
            return httpCode.ok(bde);
        } catch (e) {
            if (e.type === BDEErrorType.BDE_NOT_EXISTS) {
                return httpCode.notFound('No BDE with this UUID exists.');
            } else {
                return httpCode.internalServerError('Unable to fetch BDE with the given UUID. Contact an administrator or retry later.');
            }
        }
    }

}