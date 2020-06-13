import {hide} from './hide';

import {expect} from 'chai';

describe('Hide utility function', () => {

    it('should hide the specified properties', () => {
        let obj = {
            name: 'Admin',
            password: 'thepass',
        };
        let hiddenObj = hide(obj, 'password');
        expect(hiddenObj.password).to.eq('thepass');
        expect(Object.keys(hiddenObj)).to.eql(['name']);
    });

})