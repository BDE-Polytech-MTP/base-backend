import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { mock, instance, verify, when, anything, reset, deepEqual, resetCalls } from 'ts-mockito';
import { UsersService, AuthenticationService, MailingService, UsersServiceError, UsersErrorType, JWTClaims } from '../services';
import { UsersController } from '../controllers';
import { HttpCode } from '../utils/http-code';
import { User, UnregisteredUser, Permissions } from '../models';

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Users controller', () => {

    const usersServiceMock = mock<UsersService>();
    const authServiceMock = mock<AuthenticationService>();
    const mailingServiceMock = mock<MailingService>();
    const controller = new UsersController(instance(usersServiceMock), instance(authServiceMock), instance(mailingServiceMock));

    beforeEach(() => {
        reset(usersServiceMock);
        reset(mailingServiceMock);
        reset(authServiceMock);
        when(authServiceMock.hashPassword('thepassword')).thenReturn('thepassword');
    });

    describe('create', () => {

        it('should return "unauthorized" http code when given token is undefined', async () => {
            const result = await controller.create({});
            
            expect(result.code).to.eq(HttpCode.Unauthorized);
        });

        it('should return "unauthorized" http code when auth service rejects given token', async () => {
            when(authServiceMock.verifyToken('the-token')).thenReject();

            const result = await controller.create({}, 'the-token');
            verify(authServiceMock.verifyToken('the-token')).once();
            expect(result.code).to.eq(HttpCode.Unauthorized);
        });

        const validClaims: JWTClaims = {
            bdeUUID: 'bde-uuid',
            firstname: 'Firstname',
            lastname: 'Lastname',
            permissions: [Permissions.ADD_USER],
            uuid: 'the-uuid',
        };

        it('should return "forbidden" http code when user does not have required permission', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve({
                ... validClaims,
                permissions: [],
            });

            const result = await controller.create({
                email: 'valid-email@provider.tld',
                bde: 'bde-uuid',
            }, 'the-token');

            verify(authServiceMock.verifyToken('the-token')).once();
            expect(result.code).to.eq(HttpCode.Forbidden);
        });

        it('should return "forbidden" http code when user tries to add an user in an other BDE', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(validClaims);

            const result = await controller.create({
                email: 'valid-email@provider.tld',
                bde: 'other-bde-uuid',
            }, 'the-token');

            verify(authServiceMock.verifyToken('the-token')).once();
            expect(result.code).to.eq(HttpCode.Forbidden);
        });

        it('should return "bad request" http code when given email is malformed', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(validClaims);

            const result = await controller.create({
                email: 'invalid-email@',
                bde: 'bde-uuid',
            }, 'the-token');

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('email');
        });

        it('should return "bad request" http code when given bde uuid is empty', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(validClaims);

            const result = await controller.create({
                email: 'valid-email@provider.dev',
                bde: '',
            }, 'the-token');

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('bde');
        });

        it('should return "bad request" http code when given fistname is too short', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(validClaims);

            const result = await controller.create({
                email: 'valid-email@provider.dev',
                bde: 'the-uuid',
                firstname: 'a'
            }, 'the-token');

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('firstname');
        });

        it('should return "bad request" http code when given lastname is too short', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(validClaims);

            const result = await controller.create({
                email: 'valid-email@provider.dev',
                bde: 'the-uuid',
                lastname: 'a'
            }, 'the-token');

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('lastname');
        });

        const validBody = {
            email: 'valid-email@provider.tld',
            bde: 'bde-uuid',
        };

        it('should return "bad request" http code when users service rejects with USER_ALREADY_EXISTS error', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(validClaims);
            when(usersServiceMock.create(anything())).thenReject(new UsersServiceError('', UsersErrorType.USER_ALREADY_EXISTS));

            const result = await controller.create(validBody, 'the-token');
            verify(usersServiceMock.create(anything())).once();
            expect(result.code).to.eq(HttpCode.BadRequest);
        });

        it('should return "internal server error" http code when users service rejects with INTERNAL error', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(validClaims);
            when(usersServiceMock.create(anything())).thenReject(new UsersServiceError('', UsersErrorType.INTERNAL));

            const result = await controller.create(validBody, 'the-token');
            verify(usersServiceMock.create(anything())).once();
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return "internal server error" http code when users service resolves and mailing service rejects with INTERNAL error', async () => {
            const user: UnregisteredUser = { uuid: 'user-uuid', bdeUUID: validBody.bde, email: validBody.email, permissions: [] };
            when(authServiceMock.verifyToken('the-token')).thenResolve(validClaims);
            when(usersServiceMock.create(anything())).thenResolve(user);
            when(mailingServiceMock.sendRegistrationMail(user)).thenReject(new Error(''));

            const result = await controller.create(validBody, 'the-token');
            verify(usersServiceMock.create(anything())).once();
            verify(mailingServiceMock.sendRegistrationMail(user)).once();
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return "created" http code when users service and mailing service resolves', async () => {
            const user: UnregisteredUser = { uuid: 'user-uuid', bdeUUID: validBody.bde, email: validBody.email, permissions: [] };
            when(authServiceMock.verifyToken('the-token')).thenResolve(validClaims);
            when(usersServiceMock.create(anything())).thenResolve(user);
            when(mailingServiceMock.sendRegistrationMail(user)).thenResolve();

            const result = await controller.create(validBody, 'the-token');
            verify(usersServiceMock.create(anything())).once();
            verify(mailingServiceMock.sendRegistrationMail(user)).once();
            expect(result.code).to.eq(HttpCode.Created);
        });

    });

    describe('finishUserRegistration', () => {

        it('should return "bad request" http code when given uuid is empty', async () => {
            const result = await controller.finishUserRegistration({
                uuid: '',
                firstname: 'Firstname',
                lastname: 'LASTNAME',
                specialty: 'IG',
                password: 'thepassword',
                year: 2,
            });

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('uuid');
        });

        it('should return "bad request" http code when given firstname is too short', async () => {
            const result = await controller.finishUserRegistration({
                uuid: 'the-uuid',
                firstname: '1',
                lastname: 'LASTNAME',
                specialty: 'IG',
                password: 'thepassword',
                year: 2,
            });

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('firstname');
        });

        it('should return "bad request" http code when given lastname is too short', async () => {
            const result = await controller.finishUserRegistration({
                uuid: 'the-uuid',
                firstname: 'Firstname',
                lastname: '1',
                specialty: 'IG',
                password: 'thepassword',
                year: 2,
            });

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('lastname');
        });

        it('should return "bad request" http code when given specialty is empty', async () => {
            const result = await controller.finishUserRegistration({
                uuid: 'the-uuid',
                firstname: 'Firstname',
                lastname: 'LASTNAME',
                specialty: '',
                password: 'thepassword',
                year: 2,
            });

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('specialty');
        });

        it('should return "bad request" http code when given password is too short', async () => {
            const result = await controller.finishUserRegistration({
                uuid: 'the-uuid',
                firstname: 'Firstname',
                lastname: 'LASTNAME',
                specialty: 'IG',
                password: 'length<10',
                year: 2,
            });

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('password');
        });

        it('should return "bad request" http code when given year is lower than or equal to 0', async () => {
            const result = await controller.finishUserRegistration({
                uuid: 'the-uuid',
                firstname: 'Firstname',
                lastname: 'LASTNAME',
                specialty: 'IG',
                password: 'thepassword',
                year: 0,
            });

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('year');
        });

        it('should return "bad request" http code when given year is greater than 5', async () => {
            const result = await controller.finishUserRegistration({
                uuid: 'the-uuid',
                firstname: 'Firstname',
                lastname: 'LASTNAME',
                specialty: 'IG',
                password: 'thepassword',
                year: 6,
            });

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('year');
        });

        const validBody = {
            uuid: 'the-uuid',
            firstname: 'Firstname',
            lastname: 'LASTNAME',
            specialty: 'IG',
            password: 'thepassword',
            year: 2,
        };

        const unregisteredUser: UnregisteredUser = {
            uuid: validBody.uuid,
            bdeUUID: 'bde-uuid',
            email: 'valid-email@provider.tld',
            permissions: [],
        }

        const user: User = {
            ... unregisteredUser,
            firstname: validBody.firstname,
            lastname: validBody.lastname,
            specialtyName: validBody.specialty,
            specialtyYear: validBody.year,
            password: validBody.password,
        };

        it('should return "bad request" http code when users service returns USER_NOT_EXISTS error on user fetching', async () => {
            when(usersServiceMock.findUnregisteredByUUID('the-uuid')).thenReject(new UsersServiceError('', UsersErrorType.USER_NOT_EXISTS));
            
            const result = await controller.finishUserRegistration(validBody);

            verify(usersServiceMock.findUnregisteredByUUID('the-uuid')).once();
            expect(result.code).to.eq(HttpCode.BadRequest);
        });

        it('should return "internal server error" http code when users service returns INTERNAL error on user fetching', async () => {
            when(usersServiceMock.findUnregisteredByUUID('the-uuid')).thenReject(new UsersServiceError('', UsersErrorType.INTERNAL));
            
            const result = await controller.finishUserRegistration(validBody);

            verify(usersServiceMock.findUnregisteredByUUID('the-uuid')).once();
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return "bad request" http code when users service returns USER_NOT_EXISTS error on user update', async () => {
            when(usersServiceMock.findUnregisteredByUUID('the-uuid')).thenResolve(unregisteredUser);
            when(usersServiceMock.finishRegistration(deepEqual(user))).thenReject(new UsersServiceError('', UsersErrorType.USER_NOT_EXISTS));
            
            const result = await controller.finishUserRegistration(validBody);

            verify(usersServiceMock.findUnregisteredByUUID('the-uuid')).once();
            verify(usersServiceMock.finishRegistration(deepEqual(user))).once();
            expect(result.code).to.eq(HttpCode.BadRequest);
        });

        it('should return "bad request" http code when users service returns INTERNAL error on user update', async () => {
            when(usersServiceMock.findUnregisteredByUUID('the-uuid')).thenResolve(unregisteredUser);
            when(usersServiceMock.finishRegistration(deepEqual(user))).thenReject(new UsersServiceError('', UsersErrorType.INTERNAL));
            
            const result = await controller.finishUserRegistration(validBody);

            verify(usersServiceMock.findUnregisteredByUUID('the-uuid')).once();
            verify(usersServiceMock.finishRegistration(deepEqual(user))).once();
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return "bad request" http code when users service returns INVALID_SPECIALTY error on user update', async () => {
            when(usersServiceMock.findUnregisteredByUUID('the-uuid')).thenResolve(unregisteredUser);
            when(usersServiceMock.finishRegistration(deepEqual(user))).thenReject(new UsersServiceError('', UsersErrorType.INVALID_SPECIALTY));
            
            const result = await controller.finishUserRegistration(validBody);

            verify(usersServiceMock.findUnregisteredByUUID('the-uuid')).once();
            verify(usersServiceMock.finishRegistration(deepEqual(user))).once();
            expect(result.code).to.eq(HttpCode.BadRequest);
        });

        it('should return "ok" http code when users service resolves', async () => {
            when(usersServiceMock.findUnregisteredByUUID('the-uuid')).thenResolve(unregisteredUser);
            when(usersServiceMock.finishRegistration(deepEqual(user))).thenResolve(user);
            
            const result = await controller.finishUserRegistration(validBody);

            verify(usersServiceMock.findUnregisteredByUUID('the-uuid')).once();
            verify(usersServiceMock.finishRegistration(deepEqual(user))).once();
            expect(result.code).to.eq(HttpCode.Ok);
            expect(Object.keys(result.body)).to.not.contain('password');
        });

    });

    describe('connectUser', () => {

        it('should return "bad request" http code when given email is invalid', async () => {
            const result = await controller.connectUser({
                email: 'invalid-email@',
                password: 'thepassword',
            });

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('email');
        });

        it('should return "bad request" http code when given password is empty', async () => {
            const result = await controller.connectUser({
                email: 'valid-email@provider.tld',
                password: '',
            });

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('password');
        });

        it('should return "bad request" http code when auth service rejects with a basic error.', async () => {
            when(authServiceMock.authenticate('valid-email@provider.tld', 'thepassword')).thenReject(new Error('Invalid credentials.'));
            
            const result = await controller.connectUser({
                email: 'valid-email@provider.tld',
                password: 'thepassword',
            });

            verify(authServiceMock.authenticate('valid-email@provider.tld', 'thepassword')).once();
            expect(result.code).to.eq(HttpCode.BadRequest);
        });

        it('should return "bad request" http code when auth service rejects with INTERNAL error.', async () => {
            when(authServiceMock.authenticate('valid-email@provider.tld', 'thepassword')).thenReject(new UsersServiceError('', UsersErrorType.INTERNAL));
            
            const result = await controller.connectUser({
                email: 'valid-email@provider.tld',
                password: 'thepassword',
            });

            verify(authServiceMock.authenticate('valid-email@provider.tld', 'thepassword')).once();
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return "internal server error" http code when token generation rejects.', async () => {
            const user: User = {
                uuid: 'the-uuid',
                bdeUUID: 'bde-uuid',
                email: 'valid-email@provider.tld',
                firstname: 'Firstname',
                lastname: 'LASTNAME',
                password: 'thepassword',
                specialtyName: 'IG',
                specialtyYear: 2,
                permissions: [],
            };
            when(authServiceMock.authenticate('valid-email@provider.tld', 'thepassword')).thenResolve(user);
            when(authServiceMock.generateToken(deepEqual(user))).thenReject(new Error(''));

            const result = await controller.connectUser({
                email: 'valid-email@provider.tld',
                password: 'thepassword',
            });

            verify(authServiceMock.authenticate('valid-email@provider.tld', 'thepassword')).once();
            verify(authServiceMock.generateToken(deepEqual(user))).once();
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return "ok" http code when token generation resolves.', async () => {
            const user: User = {
                uuid: 'the-uuid',
                bdeUUID: 'bde-uuid',
                email: 'valid-email@provider.tld',
                firstname: 'Firstname',
                lastname: 'LASTNAME',
                password: 'thepassword',
                specialtyName: 'IG',
                specialtyYear: 2,
                permissions: [],
            };
            when(authServiceMock.authenticate('valid-email@provider.tld', 'thepassword')).thenResolve(user);
            when(authServiceMock.generateToken(deepEqual(user))).thenResolve('the-token');

            const result = await controller.connectUser({
                email: 'valid-email@provider.tld',
                password: 'thepassword',
            });

            verify(authServiceMock.authenticate('valid-email@provider.tld', 'thepassword')).once();
            verify(authServiceMock.generateToken(deepEqual(user))).once();
            expect(result.code).to.eq(HttpCode.Ok);
            expect(result.body).to.have.property('token', 'the-token');
        });

    });

    describe('getUnregisteredUser', () => {

        it('should return "bad request" http code when given uuid is empty', async () => {
            const result = await controller.getUnregisteredUser('');
            
            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
        });

        it('should return "internal server error" http code when users service rejects with INTERNAL error', async () => {
            when(usersServiceMock.findUnregisteredByUUID('the-uuid')).thenReject(new UsersServiceError('', UsersErrorType.INTERNAL));

            const result = await controller.getUnregisteredUser('the-uuid');
            verify(usersServiceMock.findUnregisteredByUUID('the-uuid')).once();
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return "not found" http code when users service rejects with USER_NOT_EXISTS error', async () => {
            when(usersServiceMock.findUnregisteredByUUID('the-uuid')).thenReject(new UsersServiceError('', UsersErrorType.USER_NOT_EXISTS));

            const result = await controller.getUnregisteredUser('the-uuid');
            verify(usersServiceMock.findUnregisteredByUUID('the-uuid')).once();
            expect(result.code).to.eq(HttpCode.NotFound);
        });

        it('should return "ok" http code when users service resolves', async () => {
            when(usersServiceMock.findUnregisteredByUUID('the-uuid')).thenResolve({
                bdeUUID: 'bde-uuid',
                email: 'valid-email@provider.tld',
                uuid: 'the-uuid',
                permissions: [],
            });

            const result = await controller.getUnregisteredUser('the-uuid');
            verify(usersServiceMock.findUnregisteredByUUID('the-uuid')).once();
            expect(result.code).to.eq(HttpCode.Ok);
        });

    });

});