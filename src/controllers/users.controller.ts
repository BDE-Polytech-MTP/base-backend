import { UsersService, UsersErrorType, AuthenticationService, MailingService } from "../services";
import { UnregisteredUser, User } from "../models";
import { ValidatorBuilder } from '../validation';
import { v4 as uuid } from 'uuid';
import * as httpCode from '../utils/http-code';
import { hide } from '../utils/hide';

export class UsersController {

    private static EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    private static UNREGISTERED_USER_VALIDATOR = ValidatorBuilder
                                            .new<{ email: string, bde: string, firstname?: string, lastname?: string}>()
                                            .requires("email").toBeString().matching(UsersController.EMAIL_REGEX)
                                            .requires("bde").toBeString().withMinLength(1)
                                            .optional("firstname").toBeString().withMinLength(2).withMaxLength(15)
                                            .optional("lastname").toBeString().withMinLength(2).withMaxLength(15)
                                            .build();

    private static USER_VALIDATOR = ValidatorBuilder
                                            .new<{
                                                uuid: string, 
                                                firstname: string, 
                                                lastname: string, 
                                                specialty: string, 
                                                password: string,
                                                year: number,
                                                bde: string
                                            }>()
                                            .requires("uuid").toBeString().withMinLength(1)
                                            .requires("firstname").toBeString().withMinLength(2).withMaxLength(15)
                                            .requires("lastname").toBeString().withMinLength(2).withMaxLength(15)
                                            .requires("specialty").toBeString().withMinLength(1)
                                            .requires("year").toBeInteger().withMinValue(1).withMaxValue(5)
                                            .requires("password").toBeString().withMinLength(10)
                                            .build();

    private static USER_CREDENTIALS_VALIDATOR = ValidatorBuilder
                                                    .new<{ email: string, password: string}>()
                                                    .requires('email').toBeString().matching(UsersController.EMAIL_REGEX)
                                                    .requires('password').toBeString().withMinLength(1)
                                                    .build();

    constructor(
        private usersService: UsersService, 
        private authService: AuthenticationService,
        private mailingService: MailingService
    ) {}

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
        };

        try {
            unregisteredUser = await this.usersService.create(unregisteredUser);
            await this.mailingService.sendRegistrationMail(unregisteredUser);
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

            firstname: result.value.firstname,
            lastname: result.value.lastname,
            specialtyName: result.value.specialty,
            specialtyYear: result.value.year,
            password: this.authService.hashPassword(result.value.password),
        };

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

    /**
     * Handles an authentication request. It tries to authenticate an user from its email and its password.
     * This method always resolves.
     * 
     * @param body The request body
     */
    async connectUser(body: object | null): Promise<httpCode.Response> {
        let result = UsersController.USER_CREDENTIALS_VALIDATOR.validate(body);
        if (!result.valid) {
            return httpCode.badRequest(result.error.message);
        }

        let user: User;
        try {
            user = await this.authService.authenticate(result.value.email, result.value.password);
        } catch (e) {
            if (e.type === UsersErrorType.INTERNAL) {
                return httpCode.internalServerError('Unable to authenticate an user. Contact an administrator or retry later.');
            }
            return httpCode.badRequest('Invalid credentials.');
        }

        try {
            let token = await this.authService.generateToken(user);
            return httpCode.ok({ token });
        } catch (e) {
            return httpCode.internalServerError('Unable to authenticate an user. Contact an administrator or retry later.');
        }
    }

    /**
     * Handles an unregistered user data fetching request for the user with the given UUID.
     * This method always resolves.
     * 
     * @param uuid The user UUID
     */
    async getUnregisteredUser(uuid: string): Promise<httpCode.Response> {
        if (uuid.length === 0) {
            return httpCode.notFound('Unexpected empty user UUID.');
        }

        try {
            const user = await this.usersService.findUnregisteredByUUID(uuid);
            return httpCode.ok(user);
        } catch (e) {
            if (e.type === UsersErrorType.USER_NOT_EXISTS) {
                return httpCode.notFound('No user with this UUID exists.');
            } else {
                return httpCode.internalServerError('Unable to access this resources. Contact an adminstrator or retry later.');
            }
        }
    }

}