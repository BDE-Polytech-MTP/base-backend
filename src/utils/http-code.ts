/**
 * Http codes names mapped to their value.
 */
export enum HttpCode {
    Ok = 200,
    Created = 201,
    NotContent = 204,
    BadRequest = 400,
    Unauthorized = 401,
    Forbidden = 403,
    NotFound = 404,
    InternalServerError = 500,
};

/**
 * Represents a response to send to the client.
 */
export interface Response {
    code: HttpCode,
    body: {[key: string]: any},
};

type ResponseData = string | object | Array<any>;

/**
 * Normalizes the given data. If the data is a string, it transforms it
 * to a object with a 'message' property with the given string as value.
 * If the data is an object, it's a noop.
 * 
 * @param data The data to normalize
 */
function normalize(data: ResponseData) {
    if (typeof data === 'string') {
        return { message: data };
    }
    return data;
}

/**
 * Creates a 'ok' http response with the given data as body.
 * 
 * @param data The body data
 */
export function ok(data: ResponseData): Response {
    return { code: HttpCode.Ok, body: normalize(data)};
}

/**
 * Creates a 'created' http response with the given data as body.
 * 
 * @param data The created data
 */
export function created(data: ResponseData): Response {
    return { code: HttpCode.Created, body: normalize(data)};
}

/**
 * Creates a 'bad request' http response with the given data as body.
 * 
 * @param data The message describing the encountered error
 */
export function badRequest(data: ResponseData): Response {
    return { code: HttpCode.BadRequest, body: normalize(data)};
}

/**
 * Creates a 'unauthorized' http response with the given data as body.
 * 
 * @param data The message describing the encountered error
 */
export function unauthorized(data: ResponseData): Response {
    return { code: HttpCode.Unauthorized, body: normalize(data)};
}

/**
 * Creates a 'forbidden' http response with the given data as body.
 * 
 * @param data The message describing the encountered error
 */
export function forbidden(data: ResponseData): Response {
    return { code: HttpCode.Forbidden, body: normalize(data)};
}

/**
 * Creates an 'internal server error' http response with the given data as body.
 * 
 * @param data The message describing the encountered error
 */
export function internalServerError(data: ResponseData): Response {
    return { code: HttpCode.InternalServerError, body: normalize(data)};
}

/**
 * Creates a 'not found' http response with the given data as body.
 * 
 * @param data The message describing the encountered error
 */
export function notFound(data: ResponseData): Response {
    return { code: HttpCode.NotFound, body: normalize(data) };
}

/**
 * Creates a 'not content' http response with no body.
 */
export function noContent(): Response {
    return { code: HttpCode.NotContent, body: {} };
}