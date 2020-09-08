/**
 * Registered user model.
 */
export interface User {

    /** User unique identifier */
    userUUID: string;

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

    /** User permissions */
    permissions: Permission[];

    /** Whether or not the user is a member */
    member: boolean;

}

/**
 * Unregistered user model.
 */
export interface UnregisteredUser {

    /** User unique identifier */
    userUUID: string;

    /* User firstname */
    firstname?: string;
    
    /** User lastname */
    lastname?: string;

    /** User email (unique) */
    email: string;

    /** UUID of the BDE the user belongs to */
    bdeUUID: string;

    /** User permissions */
    permissions: Permission[];

    /** Whether or not the user is a member */
    member: boolean;

}

/**
 * Permission that can be given to an user.
 */
export interface Permission {

    /**
     * Unique name that represents the permission.
     * When serializing a permission, only this property must be serialized.
     * When deserializeing a permission, the permission's other properties must be looked-up in Permissions array which prevail.
     */
    name: string;

    /**
     * Whether or not this permission is modifiable by an user having permission to modify users' permissions.
     */
    modifiable: boolean;
}

export const Permissions: {
    ALL: Permission,
    ADD_USER: Permission,
    MANAGE_PERMISSIONS: Permission,
    MANAGE_BDE: Permission,
    MANAGE_EVENTS: Permission,
} = {

    /**
     * This permission MUST be the highest permission.
     * This permission allows to do anything. It should only be given to an administrator of the server.
     */
    ALL: {
        name: 'all',
        modifiable: false,
    },

    /**
     * This permission allows to add a new unregistered user to the BDE the user having this permission.
     */
    ADD_USER: {
        name: 'add_user',
        modifiable: true,
    },

    /**
     * This permission allows an user to add or remove permissions to an user of its BDE.
     */
    MANAGE_PERMISSIONS: {
        name: 'manage_permissions',
        modifiable: true,
    },

    /**
     * This permission is given to the user who created the BDE.
     */
    MANAGE_BDE: {
        name: 'manage_bde',
        modifiable: false,
    },

    /**
     * This permissions allows an user to create/modify/delete an event organized by its BDE.
     */
    MANAGE_EVENTS: {
        name: 'manage_events',
        modifiable: true,
    },

};