import * as bcrypt from 'bcrypt';
import { createHmac } from 'crypto';

const SECRET = process.env.HMAC_SECRET || 'hmacsecret'; // Legacy

// Bcrypt
const HASH_ROUND = 10;
const BCRYPT_PREFIX = '{bcrypt}';

export interface HashStrategy {
    hash(data: string): Promise<string>;
    check(plainPassword: string, hashedPassword: string): Promise<boolean>;
}

class BCryptHashStrategy implements HashStrategy {

    constructor(private secret: string) {}
    
    async hash(password: string): Promise<string> {
        const hashedPassword = await bcrypt.hash(password, HASH_ROUND);
        return `${BCRYPT_PREFIX}${hashedPassword}`;
    }
    
    async check(plainPassword: string, hashedPassword: string): Promise<boolean> {
        if (!hashedPassword.startsWith(BCRYPT_PREFIX)) {
            return this.legacyHmacFallback(plainPassword, hashedPassword);
        }
        
        const realHashedPassword = hashedPassword.substring(BCRYPT_PREFIX.length);
        return await bcrypt.compare(plainPassword, realHashedPassword);
    }

    legacyHmacFallback(plainPassword: string, hashedPassword: string): boolean {
        const hasher = createHmac('sha256', this.secret);
        hasher.update(plainPassword, 'utf8');
        return hasher.digest('base64') === hashedPassword;
    }

}

export const DEFAULT_HASH_STRATEGY = new BCryptHashStrategy(SECRET);