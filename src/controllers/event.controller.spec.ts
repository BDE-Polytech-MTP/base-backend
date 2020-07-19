import chai from 'chai';
import { mock, instance, when, anything, reset } from 'ts-mockito';
import { EventsService, AuthenticationService, EventsServiceError, JWTClaims, EventsErrorType } from '../services';
import { EventsController } from '../controllers';
import { HttpCode } from '../utils/http-code';
import { Permissions, EventState, Event } from '../models';

const { expect } = chai;

describe('Events controller', () => {

    const eventsServiceMock = mock<EventsService>();
    const authServiceMock = mock<AuthenticationService>();
    const controller = new EventsController(instance(eventsServiceMock), instance(authServiceMock));

    beforeEach(() => {
        reset(eventsServiceMock);
        reset(authServiceMock);
    });

    describe('create', () => {

        it('should return "unauthorized" http code if no token is given', async () => {
            const result = await controller.create({});
            expect(result.code).to.eq(HttpCode.Unauthorized);
        });

        it('should return "unauthorized" http code if given token is rejected by authentication service', async () => {
            when(authServiceMock.verifyToken('the-token')).thenReject();

            const result = await controller.create({}, 'the-token');
            expect(result.code).to.eq(HttpCode.Unauthorized);
        });

        const jwtClaims: JWTClaims = {
            bdeUUID: 'bde-uuid',
            firstname: 'Firstname',
            lastname: 'Lastname',
            permissions: [Permissions.MANAGE_EVENTS],
            uuid: 'the-uuid',
        };

        const validRequestBody = {
            name: 'event-name',
            bde: 'bde-uuid', 
            isDraft: false,
        };

        it('should return "forbidden" http code when user does not have required permission', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve({ ... jwtClaims, permissions: [] });
            const result = await controller.create(validRequestBody, 'the-token');

            expect(result.code).to.eq(HttpCode.Forbidden);
        });

        it('should return "forbidden" http code when user tries to create an event for an other BDE', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            const result = await controller.create({ ... validRequestBody, bde: 'other-bde-uuid' }, 'the-token');

            expect(result.code).to.eq(HttpCode.Forbidden);
        });

        it('should return "bad request" http code if event name is missing', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            const result = await controller.create({ ... validRequestBody, name: undefined }, 'the-token');

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('name');
        });

        it('should return "bad request" http code if bde uuid is missing', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            const result = await controller.create({ ... validRequestBody, bde: undefined }, 'the-token');

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('bde');
        });

        it('should return "bad request" http code if bde uuid is missing', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            const result = await controller.create({ ... validRequestBody, isDraft: undefined }, 'the-token');

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('isDraft');
        });

        it('should return "bad request" http code if bookingStart is after bookingEnd', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            const result = await controller.create({ 
                ... validRequestBody,
                // bookingStart must be STRICTLY before bookingEnd
                bookingStart: '2020-07-19',
                bookingEnd: '2020-07-19'
            }, 'the-token');

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
        });

        it('should return "created" http code if events service resolves', async () => {
            const event: Event = {
                bdeUUID: 'bde-uuid',
                eventState: EventState.WAIT_BOOKING_TO_OPEN,
                isDraft: false,
                name: 'event-name',
                uuid: 'the-uuid'
            };

            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            when(eventsServiceMock.create(anything())).thenResolve(event);
            const result = await controller.create(validRequestBody, 'the-token');

            expect(result.code).to.eq(HttpCode.Created);
            expect(result.body).to.eq(event);
        });

        it('should return "internal server error" http code if events service rejects', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            when(eventsServiceMock.create(anything())).thenReject(new EventsServiceError('', EventsErrorType.INTERNAL));
            const result = await controller.create(validRequestBody, 'the-token');

            expect(result.code).to.eq(HttpCode.InternalServerError);
        });
        
    });

});