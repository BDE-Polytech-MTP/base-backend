import {BDEController} from './bde.controller';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {mock, instance, verify, when, anything, reset} from 'ts-mockito';
import {HttpCode} from '../utils/http-code';
import { BDEService, BDEErrorType, BDEServiceError } from '../services';
import { BDE } from '../models';

chai.use(chaiAsPromised);

const { expect } = chai;

describe('BDE controller', () => {

    const serviceMock = mock<BDEService>();

    beforeEach(() => {
        reset(serviceMock);
    });

    describe('createBde', () => {

        it('should return "bad request" http code when empty BDE name is given', async () => {
            const controller = new BDEController(instance(serviceMock));

            let body = {
                name: '',
                specialties: [{ name: 'IG', minYear: 1, maxYear: 5 }]
            };

            let result = await controller.create(body);
            expect(result.code, 'BDE name is empty, it should return a bad request status code.').to.eq(HttpCode.BadRequest);
            expect(result.body, 'Error response body must contain a descriptive error message.').to.have.property('message');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('name');
        });

        it('should return "bad request" http code when empty specialty array is given', async () => {
            const controller = new BDEController(instance(serviceMock));

            let body = {
                name: 'Montpellier',
                specialties: []
            };

            let result = await controller.create(body);
            expect(result.code, 'Specialties array is empty, it should return a bad request status code.').to.eq(HttpCode.BadRequest);
            expect(result.body, 'Error response body must contain a descriptive error message.').to.have.property('message');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('specialties');
        });

        it('should return "bad request" http code when empty name is given for a specialty', async () => {
            const controller = new BDEController(instance(serviceMock));

            let body = {
                name: 'Montpellier',
                specialties: [{ name: '', minYear: 1, maxYear: 5}],
            };

            let result = await controller.create(body);
            expect(result.code, 'Specialties array is empty, it should return a bad request status code.').to.eq(HttpCode.BadRequest);
            expect(result.body, 'Error response body must contain a descriptive error message.').to.have.property('message');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('name');
        });

        it('should return "bad request" http code when a value lower than or equal to 0 is given for a specialty min year', async () => {
            const controller = new BDEController(instance(serviceMock));

            let body = {
                name: 'Montpellier',
                specialties: [{ name: 'IG', minYear: 0, maxYear: 5}],
            };

            let result = await controller.create(body);
            expect(result.code, 'Specialties array is empty, it should return a bad request status code.').to.eq(HttpCode.BadRequest);
            expect(result.body, 'Error response body must contain a descriptive error message.').to.have.property('message');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('minYear');
        });


        it('should return "bad request" http code when a value lower than or equal to 0 is given for a specialty min year', async () => {
            const controller = new BDEController(instance(serviceMock));

            let body = {
                name: 'Montpellier',
                specialties: [{ name: 'IG', minYear: 1, maxYear: 6}],
            };

            let result = await controller.create(body);
            expect(result.code, 'Specialties array is empty, it should return a bad request status code.').to.eq(HttpCode.BadRequest);
            expect(result.body, 'Error response body must contain a descriptive error message.').to.have.property('message');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('maxYear');
        });

        it('should return "bad request" http code when minYear is greater than maxYear for a specialty', async () => {
            const controller = new BDEController(instance(serviceMock));

            let body = {
                name: 'Montpellier',
                specialties: [{ name: 'IG', minYear: 4, maxYear: 3}],
            };

            let result = await controller.create(body);
            expect(result.code, 'Specialties array is empty, it should return a bad request status code.').to.eq(HttpCode.BadRequest);
            expect(result.body, 'Error response body must contain a descriptive error message.').to.have.property('message');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('minYear');
            expect(result.body['message'], 'Error message must contain the errored property name').to.have.string('maxYear');
        });

        const validBody = {
            name: 'Montpellier',
            specialties: [{
                name: 'IG',
                minYear: 3,
                maxYear: 5
            }],
        };

        it('should return an "internal server error" http code when bde service rejects with an INTERNAL error', async () => {
            when(serviceMock.create(anything())).thenReject(new BDEServiceError('', BDEErrorType.INTERNAL));
            const controller = new BDEController(instance(serviceMock));

            const result = await controller.create(validBody);
            verify(serviceMock.create(anything())).once();
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return a "bad request" http code when bde service rejects with a BDE_ALREADY_EXISTS error', async () => {
            when(serviceMock.create(anything())).thenReject(new BDEServiceError('', BDEErrorType.BDE_ALREADY_EXISTS));
            const controller = new BDEController(instance(serviceMock));

            const result = await controller.create(validBody);
            verify(serviceMock.create(anything())).once();
            expect(result.code).to.eq(HttpCode.BadRequest);
        });

        it('should return a "created" http code when bde service resolves', async () => {
            when(serviceMock.create(anything())).thenResolve({ ... validBody, uuid: '' });
            const controller = new BDEController(instance(serviceMock));

            const result = await controller.create(validBody);
            verify(serviceMock.create(anything())).once();
            expect(result.code).to.eq(HttpCode.Created);
        });

    });


});