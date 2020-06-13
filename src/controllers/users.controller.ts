import { UsersService, UsersErrorType } from "../services";
import { UnregisteredUser, User } from "../models";
import { ValidatorBuilder } from '../validation';
import { v4 as uuid } from 'uuid';
import * as httpCode from '../utils/http-code';
import { hide } from '../utils/hide';

export class UsersController {

    private static UNREGISTERED_USER_VALIDATOR = ValidatorBuilder
                                            .new<{ email: string, bde: string, firstname?: string, lastname?: string}>()
                                            .requires("email").toBeString().matching(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/)
                                            .requires("bde").toBeString().withMinLength(1)
                                            .optional("firstname").toBeString().withMinLength(2).withMaxLength(15)
                                            .optional("lastname").toBeString().withMinLength(2).withMaxLength(15)
                                            .build();

    private static USER_VALIDATOR = ValidatorBuilder
                                            .new<{uuid: string, firstname: string, lastname: string, specialty: string, password: string, bde: string}>()
                                            .requires("uuid").toBeString().withMinLength(1)
                                            .requires("firsname").toBeString().withMinLength(2).withMaxLength(15)
                                            .requires("lastname").toBeString().withMinLength(2).withMaxLength(15)
                                            .requires("specialty").toBeString().withMinLength(1)
                                            .requires("password").toBeString().withMinLength(10)
                                            .build();


    constructor(private usersService: UsersService) {}

    /**
     * Handles a user creation request. If the creation is a success,
     * the user must complete its registration later.
     * This method always resolves.
     * 
     * @param body The request body
     */
    async create(body: object | null): Promise<httpCode.Response> {
        // TODO: Check authorization
        let result = UsersController.UNREGISTERED_USER_VALIDATOR.validate(body);
        if (!result.valid) {
            return httpCode.badRequest(result.error.message);
        }

        let unregisteredUser: UnregisteredUser = {
            uuid: uuid(),
            email: result.value.email,
            bdeUUID: result.value.bde,
            firstname: result.value.firstname,
            lastname: result.value.lastname,
        }

        try {
            await this.usersService.create(unregisteredUser);
            return httpCode.created(unregisteredUser);
        } catch (e) {
            if (e.type === UsersErrorType.USER_ALREADY_EXISTS) {
                return httpCode.badRequest('Email already used.');
            }
            return httpCode.internalServerError('Unable to create an user. Contact an administrator or try again later.');
        }
    }

    /**
     * Handles a request meant to complete the registration of an user.
     * This method always resolves.
     * 
     * @param body The request body
     */
    async finishUserRegistration(body: object | null): Promise<httpCode.Response> {
        let result = UsersController.USER_VALIDATOR.validate(body);
        if (!result.valid) {
            return httpCode.badRequest(result.error.message);
        }

        let unregisteredUser;
        try {
            unregisteredUser = await this.usersService.findUnregisteredByUUID(result.value.uuid);
        } catch (e) {
            if (e.type === UsersErrorType.USER_NOT_EXISTS) {
                return httpCode.badRequest('Can\'t find an user with the given UUID.');
            }
            return httpCode.internalServerError('Unable to finish registration of an user. Contact an administrator or retry later.');
        }

        let user: User = {
            uuid: unregisteredUser.uuid,
            bdeUUID: unregisteredUser.bdeUUID,
            email: unregisteredUser.email,

            firstname: result.value!.firstname,
            lastname: result.value!.lastname,
            specialty: result.value!.specialty,
            password: result.value!.password,
        }

        try {
            await this.usersService.finishRegistration(user);
            return httpCode.ok(hide(user, 'password'));
        } catch (e) {
            if (e.type === UsersErrorType.USER_NOT_EXISTS) {
                return httpCode.badRequest('No user with the given UUID exists.');
            } else if (e.type === UsersErrorType.INVALID_SPECIALTY) {
                return httpCode.badRequest('The specified specialty is not provided by your BDE');
            }
            return httpCode.internalServerError('Unable to finish registration of an user. Contact an administrator or retry later.');
        }
    }

}