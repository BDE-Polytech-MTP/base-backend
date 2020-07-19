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

    /** User permissions */
    permissions: Permission[];

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

    /** User permissions */
    permissions: Permission[];

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
     * Level of the permission, the higher this level is, the more power the user owns. It governs which user can affect which user.
     * 
     * Example : 
     *  An user with the permission to modify permissions of an other user will only be able to modify permissions for an user
     *  who has a "highest permission level" lower than its own. The "highest permission level" is the maximum level found
     *  in all permissions owned by the user.
     */
    level: number;

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
        level: 9999,
        modifiable: false,
    },

    /**
     * This permission allows to add a new unregistered user to the BDE the user having this permission.
     */
    ADD_USER: {
        name: 'add_user',
        level: 100,
        modifiable: true,
    },

    /**
     * This permission allows an user to add or remove permissions to an user of its BDE.
     */
    MANAGE_PERMISSIONS: {
        name: 'manage_permissions',
        level: 500,
        modifiable: true,
    },

    /**
     * This permission is given to the user who created the BDE.
     */
    MANAGE_BDE: {
        name: 'manage_bde',
        level: 1000,
        modifiable: false,
    },

    /**
     * This permissions allows an user to create/modify/delete an event organized by its BDE.
     */
    MANAGE_EVENTS: {
        name: 'manage_events',
        level: 100,
        modifiable: true,
    },

};