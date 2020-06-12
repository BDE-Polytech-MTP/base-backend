import { BDEService, BDEErrorType } from "../services";
import { ValidatorBuilder } from '../validation'
import { BDE } from "../models";
import { v4 as uuid } from 'uuid';
import * as httpCode from '../utils/http-code'; 

export class BDEController {

    private static BDE_VALIDATOR = ValidatorBuilder.new<{ name: string }>()
                                    .requires("name").toBeString().withMinLength(1).withMaxLength(30)
                                    .build();

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
            return httpCode.badRequest(result.error!.message);
        }

        let bdeObject: BDE = {
            name: result.value!.name,
            specialties: [],
            uuid: uuid(),
        };

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

}