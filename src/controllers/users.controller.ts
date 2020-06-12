import { UsersService } from "../services";
import { UnregisteredUser, User } from "../models";
import { ValidatorBuilder } from '../validation';
import { v4 as uuid } from 'uuid';

export class UsersController {

    private static NEW_USER_VALIDATOR = ValidatorBuilder
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

    create(body: object | null): Promise<UnregisteredUser> {
        // TODO: Check authorization
        let result = UsersController.NEW_USER_VALIDATOR.validate(body);
        if (!result.valid) {
            return Promise.reject(result.error?.message);
        }

        let unregisteredUser: UnregisteredUser = {
            uuid: uuid(),
            email: result.value!.email,
            bdeUUID: result.value!.bde,
            firstname: result.value?.firstname,
            lastname: result.value?.lastname,
        }

        return this.usersService.create(unregisteredUser);
    }

    async registerUser(body: object | null): Promise<User> {
        let result = UsersController.USER_VALIDATOR.validate(body);
        if (!result.valid) {
            return Promise.reject(result.error?.message);
        }

        let unregisteredUser = await this.usersService.findUnregisteredByUUID(result.value!.uuid);

        let user: User = {
            uuid: unregisteredUser.uuid,
            bdeUUID: unregisteredUser.bdeUUID,
            email: unregisteredUser.email,

            firstname: result.value!.firstname,
            lastname: result.value!.lastname,
            specialty: result.value!.specialty,
            password: result.value!.password,
        }

        return this.usersService.finishRegistration(user);
    }

}