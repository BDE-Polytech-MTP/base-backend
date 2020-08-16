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

        it('should return "forbidden" http code when user tries to create an event for an other BDE and does not have required permission', async () => {
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

        it('should return "internal server error" http code if events service rejects with INTERNAL error', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            when(eventsServiceMock.create(anything())).thenReject(new EventsServiceError('', EventsErrorType.INTERNAL));
            const result = await controller.create(validRequestBody, 'the-token');

            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return "bad request" http code if events service rejects with BDE_UUID_NOT_EXISTS error', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            when(eventsServiceMock.create(anything())).thenReject(new EventsServiceError('', EventsErrorType.BDE_UUID_NOT_EXISTS));
            const result = await controller.create(validRequestBody, 'the-token');

            expect(result.code).to.eq(HttpCode.BadRequest);
        });
        
    });

    describe('patch', () => {

        it('should return "unauthorized" http code if no token is given', async () => {
            const result = await controller.patchEvent('event-uuid', {});
            expect(result.code).to.eq(HttpCode.Unauthorized);
        });

        it('should return "unauthorized" http code if given token is rejected by auth service', async () => {
            when(authServiceMock.verifyToken('the-token')).thenReject();

            const result = await controller.patchEvent('event-uuid', {}, 'the-token');
            expect(result.code).to.eq(HttpCode.Unauthorized);
        });

        const jwtClaims: JWTClaims = {
            bdeUUID: 'bde-uuid',
            firstname: 'Firstname',
            lastname: 'Lastname',
            permissions: [Permissions.MANAGE_EVENTS],
            uuid: 'the-uuid',
        };

        const eventToPatch: Event = {
            uuid: 'event-uuid',
            bdeUUID: 'bde-uuid',
            name: 'Event name',
            isDraft: false,
            eventState: 0
        };

        const validRequestBody = {
            name: 'event-name',
            bde: 'bde-uuid', 
            isDraft: false,
        };

        it('should return "forbidden" http code when user tries to patch an event of his BDE and does not have required permission', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve({ ... jwtClaims, permissions: [] });
            when(eventsServiceMock.findByUUID('event-uuid')).thenResolve(eventToPatch);

            const result = await controller.patchEvent('event-uuid', validRequestBody, 'the-token');
            expect(result.code).to.eq(HttpCode.Forbidden);
        });

        it('should return "forbidden" http code when user tries to patch an event of an other BDE and does not have required permission', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            when(eventsServiceMock.findByUUID('event-uuid')).thenResolve({... eventToPatch, bdeUUID: 'other-bde-uuid' });
            
            const result = await controller.patchEvent('event-uuid', { ... validRequestBody, bde: 'other-bde-uuid' }, 'the-token');
            expect(result.code).to.eq(HttpCode.Forbidden);
        });

        it('should return "forbidden" http code when user tries to change bde UUID of an event of it\'s own BDE and does not have required permission', async () => {
            // Way 1
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            when(eventsServiceMock.findByUUID('event-uuid')).thenResolve(eventToPatch);
            
            let result = await controller.patchEvent('event-uuid', { ... validRequestBody, bde: 'other-bde-uuid' }, 'the-token');
            expect(result.code).to.eq(HttpCode.Forbidden);

            // Way 2
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            when(eventsServiceMock.findByUUID('event-uuid')).thenResolve({ ... eventToPatch, bdeUUID: 'other-bde-uuid' });
            
            result = await controller.patchEvent('event-uuid', validRequestBody, 'the-token');
            expect(result.code).to.eq(HttpCode.Forbidden);
        });

        it('should return "bad request" if event name is missing', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);

            const result = await controller.patchEvent('event-uuid', { ... validRequestBody, name: undefined }, 'the-token');

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('name');
        });

        it('should return "bad request" if bde uuid is missing', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);

            const result = await controller.patchEvent('event-uuid', { ... validRequestBody, bde: undefined }, 'the-token');

            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('bde');
        });

        it('should return "bad request" if isDraft is missing', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);

            const result = await controller.patchEvent('event-uuid', { ... validRequestBody, isDraft: undefined }, 'the-token');
            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('isDraft');
        });


        it('should return "bad request" if bookingStart is not strictly before bookingEnd', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);

            const result = await controller.patchEvent('event-uuid', { 
                ... validRequestBody, 
                bookingStart: '2020-07-19',
                bookingEnd: '2020-07-19'
            }, 'the-token');
            expect(result.code).to.eq(HttpCode.BadRequest);
            expect(result.body).to.have.property('message');
            expect(result.body['message']).to.have.string('bookingStart');
            expect(result.body['message']).to.have.string('bookingEnd');
        });

        it('should return "not found" http code if the events service rejects with EVENT_NOT_EXISTS on findByUUID call', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            when(eventsServiceMock.findByUUID('event-uuid')).thenReject(new EventsServiceError('', EventsErrorType.EVENT_NOT_EXISTS));

            const result = await controller.patchEvent('event-uuid', validRequestBody, 'the-token');
            expect(result.code).to.eq(HttpCode.NotFound);
        });

        it('should return "internal server error" http code if the events service rejects with INTERNAL on findByUUID call', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            when(eventsServiceMock.findByUUID('event-uuid')).thenReject(new EventsServiceError('', EventsErrorType.INTERNAL));

            const result = await controller.patchEvent('event-uuid', validRequestBody, 'the-token');
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return "not found" http code if the events service rejects with EVENT_NOT_EXISTS on update call', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            when(eventsServiceMock.findByUUID('event-uuid')).thenResolve(eventToPatch);
            when(eventsServiceMock.update(anything())).thenReject(new EventsServiceError('', EventsErrorType.EVENT_NOT_EXISTS));

            const result = await controller.patchEvent('event-uuid', validRequestBody, 'the-token');
            expect(result.code).to.eq(HttpCode.NotFound);
        });

        it('should return "internal server error" http code if the events service rejects with INTERNAL on update call', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            when(eventsServiceMock.findByUUID('event-uuid')).thenResolve(eventToPatch);
            when(eventsServiceMock.update(anything())).thenReject(new EventsServiceError('', EventsErrorType.INTERNAL));

            const result = await controller.patchEvent('event-uuid', validRequestBody, 'the-token');
            expect(result.code).to.eq(HttpCode.InternalServerError);
        });

        it('should return "bad request" http code if the events service rejects with BDE_UUID_NOT_EXISTS on update call', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            when(eventsServiceMock.findByUUID('event-uuid')).thenResolve(eventToPatch);
            when(eventsServiceMock.update(anything())).thenReject(new EventsServiceError('', EventsErrorType.BDE_UUID_NOT_EXISTS));

            const result = await controller.patchEvent('event-uuid', validRequestBody, 'the-token');
            expect(result.code).to.eq(HttpCode.BadRequest);
        });

        it('should return "ok" http code if patch is a success', async () => {
            when(authServiceMock.verifyToken('the-token')).thenResolve(jwtClaims);
            when(eventsServiceMock.findByUUID('event-uuid')).thenResolve(eventToPatch);
            when(eventsServiceMock.update(anything())).thenResolve(eventToPatch);

            const result = await controller.patchEvent('event-uuid', validRequestBody, 'the-token');
            expect(result.code).to.eq(HttpCode.Ok);
        });

    });

});