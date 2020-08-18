import {BDEController} from './bde.controller';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {mock, instance, verify, when, anything, reset} from 'ts-mockito';
import {HttpCode} from '../utils/http-code';
import { BDEService, BDEErrorType, BDEServiceError, MailingService, LoggingService } from '../services';

chai.use(chaiAsPromised);

const { expect } = chai;

describe('BDE controller', () => {

    const serviceMock = mock<BDEService>();
    const mailingServiceMock = mock<MailingService>();
    const loggingServiceMock = mock<LoggingService>();
    const controller = new BDEController(instance(serviceMock), instance(mailingServiceMock), instance(loggingServiceMock));

    beforeEach(() => {
        reset(serviceMock);
        reset(mailingServiceMock);
    });

    describe('createBde', () => {

        it('should return "bad request" http code when empty BDE name is given', async () => {
            let body = {
                name: '',
                specialties: [{ name: 'IG', minYear: 1, maxYear: 5 }],
                ownerEmail: 'valid-email@provider.tld',
            };

            let result = await controller.create(body);
            expect(result.code, 'BDE name is empty, it should return a bad request status code.').to.eq(HttpCode.BadRequest);
            expect(result.body, 'Error response body must contain a descriptive error message.').to.have.property('message');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('name');
        });

        it('should return "bad request" http code when empty specialty array is given', async () => {
            let body = {
                name: 'Montpellier',
                specialties: [],
                ownerEmail: 'valid-email@provider.tld',
            };

            let result = await controller.create(body);
            expect(result.code, 'Specialties array is empty, it should return a bad request status code.').to.eq(HttpCode.BadRequest);
            expect(result.body, 'Error response body must contain a descriptive error message.').to.have.property('message');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('specialties');
        });

        it('should return "bad request" http code when empty name is given for a specialty', async () => {
            let body = {
                name: 'Montpellier',
                specialties: [{ name: '', minYear: 1, maxYear: 5}],
                ownerEmail: 'valid-email@provider.tld',
            };

            let result = await controller.create(body);
            expect(result.code, 'Specialties array is empty, it should return a bad request status code.').to.eq(HttpCode.BadRequest);
            expect(result.body, 'Error response body must contain a descriptive error message.').to.have.property('message');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('name');
        });

        it('should return "bad request" http code when a value lower than or equal to 0 is given for a specialty min year', async () => {
            let body = {
                name: 'Montpellier',
                specialties: [{ name: 'IG', minYear: 0, maxYear: 5}],
                ownerEmail: 'valid-email@provider.tld',
            };

            let result = await controller.create(body);
            expect(result.code, 'Specialties array is empty, it should return a bad request status code.').to.eq(HttpCode.BadRequest);
            expect(result.body, 'Error response body must contain a descriptive error message.').to.have.property('message');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('minYear');
        });


        it('should return "bad request" http code when a value lower than or equal to 0 is given for a specialty min year', async () => {
            let body = {
                name: 'Montpellier',
                specialties: [{ name: 'IG', minYear: 1, maxYear: 6}],
                ownerEmail: 'valid-email@provider.tld',
            };

            let result = await controller.create(body);
            expect(result.code, 'Specialties array is empty, it should return a bad request status code.').to.eq(HttpCode.BadRequest);
            expect(result.body, 'Error response body must contain a descriptive error message.').to.have.property('message');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('maxYear');
        });

        it('should return "bad request" http code when minYear is greater than maxYear for a specialty', async () => {
            let body = {
                name: 'Montpellier',
                specialties: [{ name: 'IG', minYear: 4, maxYear: 3}],
                ownerEmail: 'valid-email@provider.tld',
            };

            let result = await controller.create(body);
            expect(result.code, 'Specialties array is empty, it should return a bad request status code.').to.eq(HttpCode.BadRequest);
            expect(result.body, 'Error response body must contain a descriptive error message.').to.have.property('message');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('minYear');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('maxYear');
        });

        it('should return "bad request" http code when given owner email is not a valid email format', async () => {
            let body = {
                name: 'Montpellier',
                specialties: [{ name: 'IG', minYear: 1, maxYear: 3}],
                ownerEmail: '@provider.tld',
            };

            let result = await controller.create(body);
            expect(result.code, 'It should return "bad request" http code').to.eq(HttpCode.BadRequest);
            expect(result.body, 'Body should contain a "message" property describing the encountered error').to.have.property('message');
        });

        const validBody = {
            name: 'Montpellier',
            specialties: [{
                name: 'IG',
                minYear: 3,
                maxYear: 5
            }],
            ownerEmail: 'valid-email@provider.tld',
        };

        it('should return "bad request" http code when bde service rejects with an USER_ALREADY_EXISTS error', async () => {
            when(serviceMock.create(anything(), anything())).thenReject(new BDEServiceError('', BDEErrorType.USER_ALREADY_EXISTS));

            const result = await controller.create(validBody);
            verify(serviceMock.create(anything(), anything())).once();
            expect(result.code).to.eq(HttpCode.BadRequest);
        });

        it('should return an "internal server error" http code when bde service rejects with an INTERNAL error', async () => {
            when(serviceMock.create(anything(), anything())).thenReject(new BDEServiceError('', BDEErrorType.INTERNAL));

            const result = await controller.create(validBody);
            verify(serviceMock.create(anything(), anything())).once();
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return an "internal server error" http code when mailing service rejects', async () => {
            when(serviceMock.create(anything(), anything())).thenResolve({ ... validBody, bdeUUID: '', bdeName: validBody.name });
            when(mailingServiceMock.sendRegistrationMail(anything())).thenReject(new Error(''));

            const result = await controller.create(validBody);
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return a "bad request" http code when bde service rejects with a BDE_ALREADY_EXISTS error', async () => {
            when(serviceMock.create(anything(), anything())).thenReject(new BDEServiceError('', BDEErrorType.BDE_ALREADY_EXISTS));

            const result = await controller.create(validBody);
            verify(serviceMock.create(anything(), anything())).once();
            expect(result.code).to.eq(HttpCode.BadRequest);
        });

        it('should return a "created" http code when bde service resolves', async () => {
            when(serviceMock.create(anything(), anything())).thenResolve({ ... validBody, bdeUUID: '', bdeName: validBody.name });

            const result = await controller.create(validBody);
            verify(serviceMock.create(anything(), anything())).once();
            expect(result.code).to.eq(HttpCode.Created);
        });

    });

    describe('listAll', () => {

        it('should return "internal server error" http code if bde service rejects with INTERNAL error', async () => {
            when(serviceMock.listAll()).thenReject(new BDEServiceError('', BDEErrorType.INTERNAL));

            const result = await controller.listAll();
            verify(serviceMock.listAll()).once();
            expect(result.code).to.eq(HttpCode.InternalServerError);
            expect(result.body).to.have.property('message');
        });

        it('should return "ok" http code if the bde service resolves', async () => {
            when(serviceMock.listAll()).thenResolve([]);

            const result = await controller.listAll();
            verify(serviceMock.listAll()).once();
            expect(result.code).to.eq(HttpCode.Ok);
        });

    });

    describe('getBDE', () => {

        it('should return "internal server error" http code if bde service rejects with INTERNAL error', async () => {
            when(serviceMock.findByUUID('the-uuid')).thenReject(new BDEServiceError('', BDEErrorType.INTERNAL));

            const result = await controller.getBDE('the-uuid');
            verify(serviceMock.findByUUID('the-uuid')).once();
            expect(result.code).to.eq(HttpCode.InternalServerError);
            expect(result.body).to.have.property('message');
        });

        it('should return "bad request" http code if the given uuid is empty', async () => {
            const result = await controller.getBDE('');
            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('uuid');
        });

        it('should return "not found" http code if the bde service rejects with BDE_NOT_EXISTS error', async () => {
            when(serviceMock.findByUUID('the-uuid')).thenReject(new BDEServiceError('', BDEErrorType.BDE_NOT_EXISTS));

            const result = await controller.getBDE('the-uuid');
            verify(serviceMock.findByUUID('the-uuid')).once();
            expect(result.code).to.eq(HttpCode.NotFound);
            expect(result.body).to.have.property('message');
        });

        it('should return "ok" http code if the bde service resolves', async () => {
            when(serviceMock.findByUUID('the-uuid')).thenResolve({ bdeName: 'Montpellier', specialties: [], bdeUUID: 'the-uuid' });

            const result = await controller.getBDE('the-uuid');
            verify(serviceMock.findByUUID('the-uuid')).once();
            expect(result.code).to.eq(HttpCode.Ok); 
        });

    });


});