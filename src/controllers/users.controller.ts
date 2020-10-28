import { UsersService, UsersErrorType, AuthenticationService, MailingService, JWTClaims, LoggingService } from "../services";
import { UnregisteredUser, User } from "../models";
import { ValidatorBuilder } from '../validation';
import { v4 as uuid } from 'uuid';
import * as httpCode from '../utils/http-code';
import { hide } from '../utils/hide';
import { canManageUser } from '../utils/permissions';

export class UsersController {

    private static EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    private static UNREGISTERED_USER_VALIDATOR = ValidatorBuilder
                                            .new<{ email: string, bde: string, firstname?: string, lastname?: string, member?: boolean }>()
                                            .requires("email").toBeString().matching(UsersController.EMAIL_REGEX)
                                            .requires("bde").toBeString().withMinLength(1)
                                            .optional("firstname").toBeString().withMinLength(2).withMaxLength(15)
                                            .optional("lastname").toBeString().withMinLength(2).withMaxLength(15)
                                            .optional("member").toBeBoolean()
                                            .build();

    private static USER_VALIDATOR = ValidatorBuilder
                                            .new<{
                                                uuid: string, 
                                                firstname: string, 
                                                lastname: string, 
                                                specialty: string, 
                                                password: string,
                                                year: number,
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
        private mailingService: MailingService,
        private loggingService: LoggingService
    ) {}

    /**
     * Handles a user creation request. If the creation is a success,
     * the user must complete its registration later.
     * This method always resolves.
     * 
     * @param body The request body
     * @param userToken The user's authentication token
     */
    async create(body: object | null, userToken?: string): Promise<httpCode.Response> {
        
        /* No token were given, we return an unauthorized error */
        if (!userToken) {
            return httpCode.unauthorized('You must be connected.');
        }

        /* Trying to authenticate user from the given token */
        let claims: JWTClaims;
        try {
            claims = await this.authService.verifyToken(userToken);
        } catch (_) {
            return httpCode.unauthorized('The given token is invalid.');
        }

        /* Validating body request */
        let result = UsersController.UNREGISTERED_USER_VALIDATOR.validate(body);
        if (!result.valid) {
            return httpCode.badRequest(result.error.message);
        }

        /* Checking user permisson */
        if (!canManageUser(claims, result.value.bde)) {
            return httpCode.forbidden('You don\'t have the permission to perform this action.');
        }

        let unregisteredUser: UnregisteredUser = {
            userUUID: uuid(),
            email: result.value.email.toLowerCase(),
            bdeUUID: result.value.bde,
            firstname: result.value.firstname,
            lastname: result.value.lastname,
            permissions: [],
            member: result.value.member || false,
        };

        try {
            unregisteredUser = await this.usersService.create(unregisteredUser);
            await this.mailingService.sendRegistrationMail(unregisteredUser);
            return httpCode.created(unregisteredUser);
        } catch (e) {
            if (e.type === UsersErrorType.USER_ALREADY_EXISTS) {
                return httpCode.badRequest('Email already used.');
            }
            if (e.type === UsersErrorType.BDE_NOT_EXISTS) {
                return httpCode.badRequest("BDE UUID is invalid.");
            }
            this.loggingService.error('Unable to create user.', e);
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
            this.loggingService.error('Unable to finish user registration.', e);
            return httpCode.internalServerError('Unable to finish registration of an user. Contact an administrator or retry later.');
        }

        let hashedPassword: string;
        try {
            hashedPassword = await this.authService.hashPassword(result.value.password);
        } catch (e) {
            this.loggingService.error(e);
            return httpCode.internalServerError('Contact an adminstrator or retry later.');
        }

        let user: User = {
            userUUID: unregisteredUser.userUUID,
            bdeUUID: unregisteredUser.bdeUUID,
            email: unregisteredUser.email,
            permissions: unregisteredUser.permissions,
            member: unregisteredUser.member,

            firstname: result.value.firstname,
            lastname: result.value.lastname,
            specialtyName: result.value.specialty,
            specialtyYear: result.value.year,
            password: hashedPassword,
        };

        try {
            user = await this.usersService.finishRegistration(user);
            return httpCode.ok(hide(user, 'password'));
        } catch (e) {
            if (e.type === UsersErrorType.USER_NOT_EXISTS) {
                return httpCode.badRequest('No user with the given UUID exists.');
            } else if (e.type === UsersErrorType.INVALID_SPECIALTY) {
                return httpCode.badRequest('The specified specialty is not provided by your BDE');
            }
            this.loggingService.error('Unable to finish user registration.', e);
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
            user = await this.authService.authenticate(result.value.email.toLowerCase(), result.value.password);
        } catch (e) {
            if (e.type === UsersErrorType.INTERNAL) {
                this.loggingService.error('Unable to authenticate user.', e);
                return httpCode.internalServerError('Unable to authenticate an user. Contact an administrator or retry later.');
            }
            return httpCode.badRequest('Invalid credentials.');
        }

        try {
            let token = await this.authService.generateToken(user);
            return httpCode.ok({ token });
        } catch (e) {
            this.loggingService.error('Unable to authenticate user.', e);
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
            return httpCode.badRequest('Unexpected empty user UUID.');
        }

        try {
            const user = await this.usersService.findUnregisteredByUUID(uuid);
            return httpCode.ok(user);
        } catch (e) {
            if (e.type === UsersErrorType.USER_NOT_EXISTS) {
                return httpCode.notFound('No user with this UUID exists.');
            } else {
                this.loggingService.error('Unable to get unregistered user by UUID.', e);
                return httpCode.internalServerError('Unable to access this resources. Contact an adminstrator or retry later.');
            }
        }
    }

    /**
     * Handles a request that aims to fetch all users of a BDE.
     * This method always resolves.
     * 
     * @param bdeUUID The UUID of the BDE to get all users of
     * @param token The JWT to authenticate user
     */
    async listUsersForBDE(bdeUUID: string, token?: string): Promise<httpCode.Response> {
        
        if (!token) {
            return httpCode.unauthorized('You must provide a token.');
        }

        let jwtClaims: JWTClaims;
        try {
            jwtClaims = await this.authService.verifyToken(token);
        } catch (_) {
            return httpCode.forbidden('The provided token is invalid.');
        }

        if (!canManageUser(jwtClaims, bdeUUID)) {
            return httpCode.forbidden('You do not have permission to fetch users for this BDE.');
        }

        let users: (User | UnregisteredUser)[];
        try {
            users = await this.usersService.findAll(bdeUUID);
        } catch (e) {
            if (e.type === UsersErrorType.BDE_NOT_EXISTS) {
                return httpCode.notFound('This BDE does not exists');
            }
            this.loggingService.error(e);
            return httpCode.internalServerError('Contact an adminstrator or retry later.');
        }

        const mappedUsers = users.map(user => hide({ ... user, permissions: user.permissions.map(p => p.name) }, 'password'));

        return httpCode.ok(mappedUsers);
    }

    /**
     * Handles a request that aims to fetch an user from its UUID.
     * This method always resolves.
     * 
     * @param uuid The user UUID to fetch
     * @param token The JWT to authenticate the user
     */
    async getUser(uuid: string, token?: string): Promise<httpCode.Response> {

        if (!token) {
            return httpCode.unauthorized('You must authenticate.');
        }

        let jwtClaims: JWTClaims;
        try {
            jwtClaims = await this.authService.verifyToken(token);
        } catch (_) {
            return httpCode.forbidden('The given token is invalid.');
        }

        let user: User | UnregisteredUser;
        try {
            user = await this.usersService.findByUUID(uuid);
        } catch (e) {
            if (e.type === UsersErrorType.USER_NOT_EXISTS) {
                return httpCode.notFound('No user with the given UUID exists.');
            }
            this.loggingService.error(e);
            return httpCode.internalServerError('Unable to fetch user. Contact an adminstrator or retry later.');
        }

        if (canManageUser(jwtClaims, user.bdeUUID) || jwtClaims.uuid === user.userUUID) {
            const hidedUser = hide(user, 'password');
            return httpCode.ok({
                ... hidedUser,
                permissions: hidedUser.permissions.map(p => p.name),
            });
        }

        return httpCode.ok(hide(user, 'password', 'email', 'permissions', 'member'));
    }


    /**
     * Handles a request that aims to delete an user from its UUID.
     * This method always resolves.
     * 
     * @param uuid The user UUID to delete
     * @param token The JWT to authenticate the user
     */
    async deleteUser(uuid: string, token?: string): Promise<httpCode.Response> {

        /* No token were given, we return unauthorized response code */
        if (!token) {
            return httpCode.unauthorized('You must authenticate.');
        }

        /* We verify token validity */
        let jwtClaims: JWTClaims;
        try {
            jwtClaims = await this.authService.verifyToken(token);
        } catch (_) {
            return httpCode.forbidden('The given token is invalid.');
        }

        /* We fetch user to be deleted */
        let user: User | UnregisteredUser;
        try {
            user = await this.usersService.findByUUID(uuid);
        } catch (e) {
            if (e.type === UsersErrorType.USER_NOT_EXISTS) {
                return httpCode.notFound('No user with the given UUID exists.');
            }
            this.loggingService.error(e);
            return httpCode.internalServerError('Unable to delete user. Contact an adminstrator or retry later.');
        }

        /* We check the permission */
        if (!canManageUser(jwtClaims, user.bdeUUID)) {
            return httpCode.forbidden('You do not have the permission to delete this user.');
        }

        /* We delete the user */
        try {
            await this.usersService.delete(user.userUUID);
            return httpCode.noContent();
        } catch (e) {
            if (e.type === UsersErrorType.USER_NOT_EXISTS) {
                return httpCode.notFound('No user with the given UUID exists.');
            }
            return httpCode.internalServerError('Unable to delete user. Contact an adminstrator or retry later.');
        }
    }

}