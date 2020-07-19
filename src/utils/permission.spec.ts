import { expect } from 'chai';
import { canAddUser, canManagePermissions, canManageEvents } from './permissions';
import { Permissions } from '../models';

describe('Permissions', () => {

    describe('canAddUser', () => {
        
        it('should return true if user has permission ALL', () => {
            expect(canAddUser({ bdeUUID: 'bde-uuid', permissions: [Permissions.ALL] }, 'bde-uuid')).to.be.true;
            expect(canAddUser({ bdeUUID: 'bde-uuid', permissions: [Permissions.ALL] }, 'other-bde-uuid')).to.be.true;
        });

        it('should return true if user has permission ADD_USER and tries to add user in its own BDE', () => {
            expect(canAddUser({ bdeUUID: 'bde-uuid', permissions: [Permissions.ADD_USER] }, 'bde-uuid')).to.be.true;
        });

        it('should return false if user has permission ADD_USER and tries to add user in an other BDE', () => {
            expect(canAddUser({ bdeUUID: 'bde-uuid', permissions: [Permissions.ADD_USER] }, 'other-bde-uuid')).to.be.false;
        });

        it('should return false if user has not permission ADD_USER', () => {
            expect(canAddUser({ bdeUUID: 'bde-uuid', permissions: [] }, 'bde-uuid')).to.be.false;
            expect(canAddUser({ bdeUUID: 'bde-uuid', permissions: [] }, 'other-bde-uuid')).to.be.false;
        });

    });

    describe('canManagePermissions', () => {

        it('should return true if source has ALL permission and target has not', () => {
            expect(canManagePermissions(
                { bdeUUID: 'bde-uuid', permissions: [Permissions.ALL] },
                { bdeUUID: 'other-bde-uuid', permissions: [] }
            )).to.be.true;
        });

        it('should return false if source has ALL permission and target also have', () => {
            expect(canManagePermissions(
                { bdeUUID: 'bde-uuid', permissions: [Permissions.ALL] },
                { bdeUUID: 'other-bde-uuid', permissions: [Permissions.ALL] }
            )).to.be.false;
        });

        it('should return true if source has MANAGE_PERMISSIONS permission and an higher permission level than target and both are in same BDE', () => {
            expect(canManagePermissions(
                { bdeUUID: 'bde-uuid', permissions: [Permissions.MANAGE_PERMISSIONS] },
                { bdeUUID: 'bde-uuid', permissions: [] }
            )).to.be.true;
        });

        it('should return false if source has MANAGE_PERMISSIONS permission and an higher permission level than target but both are not in same BDE', () => {
            expect(canManagePermissions(
                { bdeUUID: 'bde-uuid', permissions: [Permissions.MANAGE_PERMISSIONS] },
                { bdeUUID: 'other-bde-uuid', permissions: [] }
            )).to.be.false;
        })

        it('should return false if source has MANAGE_PERMISSIONS permission and both are in same BDE but has a lower permission level than target', () => {
            expect(canManagePermissions(
                { bdeUUID: 'bde-uuid', permissions: [Permissions.MANAGE_PERMISSIONS] },
                { bdeUUID: 'bde-uuid', permissions: [Permissions.MANAGE_PERMISSIONS] }
            )).to.be.false;
        });

        it('should return false if source has not MANAGE_PERMISSIONS permission (neither ALL permission)', () => {
            expect(canManagePermissions(
                { bdeUUID: 'bde-uuid', permissions: [] },
                { bdeUUID: 'bde-uuid', permissions: [] }
            )).to.be.false;
        });

    });

    describe('canManageEvents', () => {

        it('should return true if source has ALL permission', () => {
            expect(canManageEvents({ bdeUUID: 'bde-uuid', permissions: [Permissions.ALL] }, 'bde-uuid')).to.be.true;
            expect(canManageEvents({ bdeUUID: 'bde-uuid', permissions: [Permissions.ALL] }, 'other-bde-uuid')).to.be.true;
        });

        it('should return true if user has permission MANAGE_EVENTS and want to manage an event that belongs to his own BDE', () => {
            expect(canManageEvents({ bdeUUID: 'bde-uuid', permissions: [Permissions.MANAGE_EVENTS] }, 'bde-uuid')).to.be.true;
        });

        it('should return false if use has permission MANAGE_EVENTS and want to manage an event that belongs to an other BDE', () => {
            expect(canManageEvents({ bdeUUID: 'bde-uuid', permissions: [Permissions.MANAGE_EVENTS] }, 'other-bde-uuid')).to.be.false;
        });

        it('should return false if user does not have MANAGE_EVENTS permission', () => {
            expect(canManageEvents({ bdeUUID: 'bde-uuid', permissions: [] }, 'bde-uuid')).to.be.false;
        });

    });

});