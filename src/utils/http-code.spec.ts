import { expect } from 'chai';
import * as httpCode from './http-code';

describe('HTTP code', () => {

    it('should return correct http code for each utility function', () => {
        expect(httpCode.ok('').code).to.eq(200);
        expect(httpCode.created('').code).to.eq(201);
        expect(httpCode.badRequest('').code).to.eq(400);
        expect(httpCode.unauthorized('').code).to.eq(401);
        expect(httpCode.forbidden('').code).to.eq(403);
        expect(httpCode.internalServerError('').code).to.eq(500);
    });

    it('should normalize message if a string is provided', () => {
        const message = 'The message';
        const expectedBody = { message };

        expect(httpCode.ok(message).body).to.eql(expectedBody);
        expect(httpCode.created(message).body).to.eql(expectedBody);
        expect(httpCode.badRequest(message).body).to.eql(expectedBody);
        expect(httpCode.unauthorized(message).body).to.eql(expectedBody);
        expect(httpCode.forbidden(message).body).to.eql(expectedBody);
        expect(httpCode.internalServerError(message).body).to.eql(expectedBody);
    });

    it('should set provided object as body if an object is provided', () => {
        const bodyData = {
            data: 'something',
            nested: [{
                age: 15
            }]
        };

        expect(httpCode.ok(bodyData).body).to.eql(bodyData);
        expect(httpCode.created(bodyData).body).to.eql(bodyData);
        expect(httpCode.badRequest(bodyData).body).to.eql(bodyData);
        expect(httpCode.unauthorized(bodyData).body).to.eql(bodyData);
        expect(httpCode.forbidden(bodyData).body).to.eql(bodyData);
        expect(httpCode.internalServerError(bodyData).body).to.eql(bodyData);
    });

});