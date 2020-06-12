import { createHmac } from 'crypto';

const SECRET = process.env.HMAC_SECRET || 'hmacsecret';
if (process.env.NODE_ENV === 'production' && SECRET === 'hmacsecret') {
    console.warn('Default password HMAC_SECRET used in production mode. Please change it !');    
}

export interface HashStrategy {
    hash(data: string): string;
}

class HMacHashStrategy implements HashStrategy {

    constructor(private secret: string) {}

    hash(password: string): string {
        const hasher = createHmac('sha256', this.secret);
        hasher.update(password, 'utf8');
        return hasher.digest('base64');
    }

}

export const DEFAULT_HASH_STRATEGY = new HMacHashStrategy(SECRET);