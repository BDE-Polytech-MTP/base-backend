import { BDEService, BDEErrorType, MailingService, LoggingService } from "../services";
import { ValidatorBuilder } from '../validation'
import { BDE, UnregisteredUser, Permissions } from "../models";
import { v4 as uuid } from 'uuid';
import * as httpCode from '../utils/http-code';

export class BDEController {

    private static EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    private static BDE_VALIDATOR = ValidatorBuilder.new<{ 
                                        name: string,
                                        ownerEmail: string,
                                        specialties: { name: string, minYear: number, maxYear: number}[]
                                        token: string,
                                    }>()
                                    .requires("name").toBeString().withMinLength(1).withMaxLength(30)
                                    .requires('ownerEmail').toBeString().matching(BDEController.EMAIL_REGEX)
                                    .requires('specialties').toBeArray().withMinLength(1).withEachElementValidating(
                                        ValidatorBuilder.new()
                                            .requires('name').toBeString().withMinLength(2).withMaxLength(10)
                                            .requires('minYear').toBeInteger().withMinValue(1).withMaxValue(5)
                                            .requires('maxYear').toBeInteger().withMinValue(1).withMaxValue(5)
                                            .build()
                                    )
                                    .optional('token').toBeString().withMinLength(1)
                                    .build();

    constructor(
        private bdeService: BDEService,
        private mailingService: MailingService,
        private loggingService: LoggingService
    ) {}

    /**
     * Handles a BDE creation request.
     * This method always resolves.
     * 
     * @param requestBody The received request body
     */
    async create(requestBody: object | null): Promise<httpCode.Response> {
        let result = BDEController.BDE_VALIDATOR.validate(requestBody);
        if (!result.valid) {
            return httpCode.badRequest(result.error.message);
        }

        /* If a token is required and that given token invalid, we reject */
        if (process.env.BDE_CREATION_TOKEN && process.env.BDE_CREATION_TOKEN !== result.value.token) {
            return httpCode.unauthorized('The specified token is invalid.');
        }

        let bdeObject: BDE = {
            bdeName: result.value.name,
            specialties: result.value.specialties.map((spe) => ({ name: spe.name, minYear: spe.minYear, maxYear: spe.maxYear })),
            bdeUUID: uuid(),
        };

        if (bdeObject.specialties.some((spe) => spe.minYear > spe.maxYear)) {
            return httpCode.badRequest('Expected specialty minYear to be lower than or equal to specialty maxYear');
        }

        const ownerUser: UnregisteredUser = {
            userUUID: uuid(),
            bdeUUID: bdeObject.bdeUUID,
            email: result.value.ownerEmail,
            permissions: [Permissions.MANAGE_BDE, Permissions.MANAGE_PERMISSIONS, Permissions.ADD_USER],
        };

        try {
            const bde = await this.bdeService.create(bdeObject, ownerUser);
            await this.mailingService.sendRegistrationMail(ownerUser);
            return httpCode.created(bde);
        } catch (e) {
            if (e.type === BDEErrorType.BDE_ALREADY_EXISTS) {
                /*
                 * If a BDE creation request fails for duplicate, it's considered as request error.
                 * The given BDE name is certainly a duplicate. An other reason to fail could be a duplicated UUID but we consider
                 * this possibility to be highly unlikely ; espcially on a low key-space as BDE one.
                 */
                return httpCode.badRequest(e.message);
            } else if (e.type === BDEErrorType.USER_ALREADY_EXISTS) {
                return httpCode.badRequest('Email already used.');
            } else {
                this.loggingService.error('Unable to create a BDE.', e);
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
            this.loggingService.error('Unable to list BDEs.', e);
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
                this.loggingService.error('Unable to get BDE by UUID.', e);
                return httpCode.internalServerError('Unable to fetch BDE with the given UUID. Contact an administrator or retry later.');
            }
        }
    }

}