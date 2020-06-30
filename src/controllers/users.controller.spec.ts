import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {mock, instance, verify, when, anything, reset} from 'ts-mockito';
import { UsersService, AuthenticationService, MailingService, UsersServiceError, UsersErrorType } from '../services';
import { UsersController } from '../controllers';
import { HttpCode } from '../utils/http-code';

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Users controller', () => {

    const usersServiceMock = mock<UsersService>();
    const authServiceMock = mock<AuthenticationService>();
    const mailingServiceMock = mock<MailingService>();
    const controller = new UsersController(instance(usersServiceMock), instance(authServiceMock), instance(mailingServiceMock));

    beforeEach(() => {
        reset(usersServiceMock);
    });

    describe('create', () => {

        it('should return "bad request" http code when given email is malformed', async () => {
            const result = await controller.create({
                email: 'invalid-email@',
                bde: 'bde-uuid',
            });

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('email');
        });

        it('should return "bad request" http code when given bde uuid is empty', async () => {
            const result = await controller.create({
                email: 'valid-email@provider.dev',
                bde: '',
            });

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('bde');
        });

        it('should return "bad request" http code when given fistname is too short', async () => {
            const result = await controller.create({
                email: 'valid-email@provider.dev',
                bde: 'the-uuid',
                firstname: 'a'
            });

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('firstname');
        });

        it('should return "bad request" http code when given lastname is too short', async () => {
            const result = await controller.create({
                email: 'valid-email@provider.dev',
                bde: 'the-uuid',
                lastname: 'a'
            });

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('lastname');
        });

        const validBody = {
            email: 'valid-email@provider.tld',
            bde: 'bde-uuid',
        };

        it('should return "bad request" http code when users service rejects with USER_ALREADY_EXISTS error', async () => {
            when(usersServiceMock.create(anything())).thenReject(new UsersServiceError('', UsersErrorType.USER_ALREADY_EXISTS));

            const result = await controller.create(validBody);
            verify(usersServiceMock.create(anything())).once();
            expect(result.code).to.eq(HttpCode.BadRequest);
        });

        it('should return "internal server error" http code when users service rejects with INTERNAL error', async () => {
            when(usersServiceMock.create(anything())).thenReject(new UsersServiceError('', UsersErrorType.INTERNAL));

            const result = await controller.create(validBody);
            verify(usersServiceMock.create(anything())).once();
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return "internal server error" http code when users service resolves and mailing service rejects with INTERNAL error', async () => {
            const user = { uuid: 'user-uuid', bdeUUID: validBody.bde, email: validBody.email };
            when(usersServiceMock.create(anything())).thenResolve(user);
            when(mailingServiceMock.sendRegistrationMail(user)).thenReject(new Error(''));

            const result = await controller.create(validBody);
            verify(usersServiceMock.create(anything())).once();
            verify(mailingServiceMock.sendRegistrationMail(user)).once();
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return "created" http code when users service and mailing service resolves', async () => {
            const user = { uuid: 'user-uuid', bdeUUID: validBody.bde, email: validBody.email };
            when(usersServiceMock.create(anything())).thenResolve(user);
            when(mailingServiceMock.sendRegistrationMail(user)).thenResolve();

            const result = await controller.create(validBody);
            verify(usersServiceMock.create(anything())).once();
            verify(mailingServiceMock.sendRegistrationMail(user)).once();
            expect(result.code).to.eq(HttpCode.Created);
        });

    });

});