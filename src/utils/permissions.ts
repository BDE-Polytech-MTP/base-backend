import { Permissions, Permission } from '../models/user.model';

/**
 * Checks whether or not the given source user can manage permissions
 * of the target user.
 * 
 * @param source The user trying to modify permissions of target user
 * @param target The user targeted by source user
 */
export function canManagePermissions(source: { bdeUUID: string, permissions: Permission[] }, target: { bdeUUID: string, permissions: Permission[]}): boolean {
    /* The ALL permission allows to bypass every permission check but should not be able to manage permissions of someone having ALL permission */
    if (source.permissions.includes(Permissions.ALL) && !target.permissions.includes(Permissions.ALL)) {
        return true;
    }

    /* The user can't manage permissions if he does not have the MANAGE_PERMISSIONS permission */
    if (!source.permissions.includes(Permissions.MANAGE_PERMISSIONS)) {
        return false;
    }

    /* The MANAGE_PERMISSIONS permission only allows to manage permissions of an user of its own BDE */
    if (source.bdeUUID !== target.bdeUUID) {
        return false;
    }
    
    return !target.permissions.includes(Permissions.MANAGE_PERMISSIONS) || source.permissions.includes(Permissions.MANAGE_BDE);
}

/**
 * Checks whether or not the given user can add an user to the BDE with the given UUID.
 * 
 * @param source The user trying to add an new user to the bde with the given uuid
 * @param bdeUUID The UUID of the bde to add an user to
 */
export function canAddUser(source: { bdeUUID: string, permissions: Permission[] }, bdeUUID: string): boolean {
    /* The ALL permission allows to bypass every permission check */
    if (source.permissions.includes(Permissions.ALL)) {
        return true;
    }

    /* The user can't add an user if he does not have the ADD_USER permission */
    if (!source.permissions.includes(Permissions.ADD_USER)) {
        return false;
    }

    /* The ADD_USER permission only allows to add an user to its own BDE */
    return source.bdeUUID === bdeUUID;
}

/**
 * Checks whether or not the given user can manage events of the BDE with the given UUID.
 * 
 * @param source The user that want to manage events for the BDE with the given UUID
 * @param bdeUUID The UUID of the BDE the events belongs to
 */
export function canManageEvents(source: { bdeUUID: string, permissions: Permission[] }, bdeUUID: string): boolean {
    /* The ALL permission allows to bypass every permission check */
    if (source.permissions.includes(Permissions.ALL)) {
        return true;
    }

    /* The user can't manage events if he does not have the MANAGE_EVENTS permission */
    if (!source.permissions.includes(Permissions.MANAGE_EVENTS)) {
        return false;
    }

    /* The MANAGE_EVENTS permission only allows to manage events of its own BDE */
    return source.bdeUUID === bdeUUID;
}

/**
 * Returns an array containing all permissions having their name contained in the given
 * string array. 
 * 
 * @param permissionsName An array of permissions names
 */
export function permissionsFromStrings(permissionsName: string[]): Permission[] {
    return Object.values(Permissions).filter(p => permissionsName.includes(p.name));
}