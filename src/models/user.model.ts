/**
 * Registered user model.
 */
export interface User {

    /** User unique identifier */
    uuid: string;

    /* User firstname */
    firstname: string;
    
    /** User lastname */
    lastname: string;
    
    /** User hashed password */
    password: string;

    /** User email (unique) */
    email: string;

    /** UUID of the BDE the user belongs to */
    bdeUUID: string;

    /** User specialty name */
    specialtyName: string;

    /** User specialty year */
    specialtyYear: number;

}

/**
 * Unregistered user model.
 */
export interface UnregisteredUser {

    /** User unique identifier */
    uuid: string;

    /* User firstname */
    firstname?: string;
    
    /** User lastname */
    lastname?: string;

    /** User email (unique) */
    email: string;

    /** UUID of the BDE the user belongs to */
    bdeUUID: string;

}