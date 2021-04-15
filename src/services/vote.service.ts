export enum VotesErrorType {
    INVALID_USER,
    INTERNAL,
};

export interface VotesService {

    vote(liste: string | null, userUUID: string): Promise<void>;

    getVote(userUUID: string): Promise<string | null>;

}

/**
 * An error class that allows to specify the type of error encountered.
 */
 export class VotesServiceError extends Error {

    constructor(message: string, public type: VotesErrorType) {
        super(message);
    }

}