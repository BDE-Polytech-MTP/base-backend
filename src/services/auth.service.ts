import { UsersService } from "./users.service";
import { User, Permission } from "../models";
import { HashStrategy } from "../utils/hash";
import { permissionsFromStrings } from '../utils/permissions';
import jwt from 'jsonwebtoken';

/**
 * Secret used to encode JWT.
 */
const JWT_SECRET = process.env.JWT_SECRET || 'jwtsecret';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'jwtsecret') {
    console.warn('Default JWT_SECRET used in production. Please change it !');
}

/**
 * Algorithm used to encore JWT.
 */
const JWT_ALGORITHM = 'HS256';

/**
 * Class responsible for authenticating users.
 */
export class AuthenticationService {

    constructor(private usersService: UsersService, private hashStrategy: HashStrategy) {}

    /**
     * Checks if an user with the given uuid and with the given password exists. 
     * 
     * @param user_email The email of the user
     * @param raw_password The plain password of the user
     */
    async authenticate(user_email: string, raw_password: string): Promise<User> {
        const user = await this.usersService.findByEmail(user_email);
        if (user.password === this.hashStrategy.hash(raw_password)) {
            return user;
        }
        throw new Error('Password don\'t match.');
    }

    /**
     * Generates a JWT for the given user.
     * 
     * @param user The user to generate JWT for
     */
    generateToken(user: User): Promise<string> {
        return new Promise((resolve, reject) => {
            const claims: SerializedJWTClaims = {
                uuid: user.uuid,
                bde_uuid: user.bdeUUID,
                firstname: user.firstname,
                lastname: user.lastname,
                permissions: user.permissions.map(p => p.name),
            };

            jwt.sign(claims, JWT_SECRET, { algorithm: JWT_ALGORITHM }, (err, token) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(token);
                }
            });
        })
    }

    /**
     * Verifies the given token is valid. If the token is valid, it resolves
     * returning the associated claims. If the token is invalid is reject returning
     * the error.
     * 
     * @param token The token to verify
     */
    verifyToken(token: string): Promise<JWTClaims> {
        return new Promise((resolve, reject) => {
            jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }, (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    const claims = <SerializedJWTClaims>decoded; // Note: This is not 100% safe
                    resolve({
                        bdeUUID: claims.bde_uuid, 
                        permissions: permissionsFromStrings(claims.permissions),
                        firstname: claims.firstname,
                        lastname: claims.lastname,
                        uuid: claims.uuid,
                     });
                }
            })
        })
    }

    /**
     * Hashes the given password.
     * 
     * @param rawPassword The plain password
     */
    hashPassword(rawPassword: string): string {
        return this.hashStrategy.hash(rawPassword);
    }

}

/**
 * JWT claims sent to client and expected to be received once token decoded.
 */
export interface JWTClaims {
    uuid: string,
    bdeUUID: string,
    firstname: string,
    lastname: string;
    permissions: Permission[],
}

interface SerializedJWTClaims {
    uuid: string,
    bde_uuid: string,
    firstname: string,
    lastname: string,
    permissions: string[],
}