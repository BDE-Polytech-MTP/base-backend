import {expect} from 'chai';
import {ValidatorBuilder} from './index';

describe('Validator behavior', () => {

    describe('Optional parameter', () => {

        const validator = ValidatorBuilder.new()
                                .optional('test').toBeString()
                                .optional('other.test').toBeInteger().withMinValue(3)
                                .build();

        it('should accept null body', () => {
            const result = validator.validate(null);
            expect(result.valid).to.be.true;
        });

        it('should accept empty body', () => {
            const result = validator.validate({});
            expect(result.valid).to.be.true;
        });

        it('should accept incomplete body', () => {
            const result = validator.validate({
                test: 'I am a string',
                other: {

                }
            });
            expect(result.valid).to.be.true;
        });

        it('should reject when parameter is present but has the wrong type', () => {
            const result = validator.validate({ "test": 3 });
            expect(result.valid).to.be.false;
        });

        it('should reject when parameter is present, has the good type, but does not match requirements', () => {
            const result = validator.validate({ "other": { "test": 2 } })
            expect(result.valid).to.be.false;
        });
    

    });

    describe('Required parameter', () => {

        const validator = ValidatorBuilder.new()
                                .requires('username').toBeString().withMinLength(5)
                                .requires('address.num').toBeInteger().withMinValue(0).withMaxValue(500)
                                .build();

        it('should reject when receiving null body', () => {
            const result = validator.validate(null);
            expect(result.valid).to.be.false;
        });

        it('should reject when a parameter is not present in the given body', () => {
            const result = validator.validate({ "username": "Florent" });
            expect(result.valid).to.be.false;
        });

        it('should reject when a parameter is present but has the wrong type', () => {
            const result = validator.validate({ "username": 2, "address": { "num": 5 } });
            expect(result.valid).to.be.false;
        });

        it('should reject when a parameter is present, has the good type, but does not meet requirements', () => {
            const result = validator.validate({ "username": "John", "address": { "num": 750 } });
            expect(result.valid).to.be.false;
        });

        it('should accept when all parameters are present and meet requirements', () => {
            const result = validator.validate({ "username": "George", "address": { "num": 120 }});
            expect(result.valid).to.be.true;
        });

    });

    describe('String requirements', () => {

        it('should reject is parameter is not a string', () => {
            const validator = ValidatorBuilder.new().requires('username').toBeString().build();
            const result = validator.validate({ "username": 123});
            expect(result.valid).to.be.false;
        });

        it('should reject if string is too short', () => {
            const validator = ValidatorBuilder.new().requires('username').toBeString().withMinLength(4).build();
            const result = validator.validate({ "username": "123" });
            expect(result.valid).to.be.false;
        });

        it('should accept if string is not too short', () => {
            const validator = ValidatorBuilder.new().requires('username').toBeString().withMinLength(2).build();
            let result = validator.validate({ "username": "12" });
            expect(result.valid).to.be.true;
            result = validator.validate({ "username": "12642123" });
            expect(result.valid).to.be.true;
        });

        it('should reject if string is too long', () => {
            const validator = ValidatorBuilder.new().requires('username').toBeString().withMaxLength(6).build();
            const result = validator.validate({ "username": "1234567" });
            expect(result.valid).to.be.false;
        });

        it('should accept if string is not too long', () => {
            const validator = ValidatorBuilder.new().requires('username').toBeString().withMaxLength(5).build();
            let result = validator.validate({ "username": "12736" });
            expect(result.valid).to.be.true;
            result = validator.validate({ "username": "15" });
            expect(result.valid).to.be.true;
        });

        it('should reject if string is not in bounds', () => {
            const validator = ValidatorBuilder.new().requires('username').toBeString().withMinLength(2).withMaxLength(5).build();
            let result = validator.validate({ "username": "A" });
            expect(result.valid).to.be.false;
            result = validator.validate({ "username": "Too long" });
            expect(result.valid).to.be.false;
        });

        it('should accept if string is in bounds', () => {
            const validator = ValidatorBuilder.new().requires('username').toBeString().withMinLength(2).withMaxLength(5).build();
            let result = validator.validate({ "username": "AH" });
            expect(result.valid).to.be.true;
            result = validator.validate({ "username": "Nice!" });
            expect(result.valid).to.be.true;
            result = validator.validate({ "username": "Rare" });
            expect(result.valid).to.be.true;
        });

        it('should reject if string does not match given regex', () => {
            const validator = ValidatorBuilder.new().requires('username').toBeString().matching(/^a/).build();
            const result = validator.validate({ "username": "bca" });
            expect(result.valid).to.be.false;
        });

        it('should accept if string does match given regex', () => {
            const validator = ValidatorBuilder.new().requires('username').toBeString().matching(/^a/).build();
            const result = validator.validate({ "username": "abc" });
            expect(result.valid).to.be.true;
        });

        it('should test against trimmed string', () => {
            const validator = ValidatorBuilder.new().requires('username').toBeString().matching(/^abcd$/).build();
            const result = validator.validate({ "username": "    abcd   " });
            expect(result.valid).to.be.true;
        });

    });

    describe('Integer requirements', () => {

        it('should reject if parameter is not a number', () => {
            const validator = ValidatorBuilder.new().requires('age').toBeInteger().build();
            const result = validator.validate({ "age": "a string" });
            expect(result.valid).to.be.false;
        });

        it('should reject if parameter is a floating number', () => {
            const validator = ValidatorBuilder.new().requires('age').toBeInteger().build();
            const result = validator.validate({ "age": 1.15 });
            expect(result.valid).to.be.false;
        });

        it('should reject if integer is too small', () => {
            const validator = ValidatorBuilder.new().requires('age').toBeInteger().withMinValue(5).build();
            const result = validator.validate({ "age": 4 });
            expect(result.valid).to.be.false;
        });

        it('should accept if integer is not too small', () => {
            const validator = ValidatorBuilder.new().requires('age').toBeInteger().withMinValue(5).build();
            let result = validator.validate({ "age": 5 });
            expect(result.valid).to.be.true;
            result = validator.validate({ "age": 15 });
            expect(result.valid).to.be.true;
        });

        it('should reject if integer is too big', () => {
            const validator = ValidatorBuilder.new().requires('age').toBeInteger().withMaxValue(40).build();
            const result = validator.validate({ "age": 41 });
            expect(result.valid).to.be.false;
        });

        it('should accept if integer is not too big', () => {
            const validator = ValidatorBuilder.new().requires('age').toBeInteger().withMaxValue(21).build();
            let result = validator.validate({ "age": 21 });
            expect(result.valid).to.be.true;
            result = validator.validate({ "age": 15 });
            expect(result.valid).to.be.true;
        });

        it('should reject if integer is not in bounds', () => {
            const validator = ValidatorBuilder.new().requires('age').toBeInteger().withMinValue(-8).withMaxValue(21).build();
            let result = validator.validate({ "age": -9 });
            expect(result.valid).to.be.false;
            result = validator.validate({ "age": 22 });
            expect(result.valid).to.be.false;
        });

        it('should accept if integer is in bounds', () => {
            const validator = ValidatorBuilder.new().requires('age').toBeInteger().withMinValue(-15).withMaxValue(0).build();
            let result = validator.validate({ "age": -15 });
            expect(result.valid).to.be.true;
            result = validator.validate({ "age": 0 });
            expect(result.valid).to.be.true;
            result = validator.validate({ "age": -8 });
            expect(result.valid).to.be.true;
        });

    });

    describe('Array requirement', () => {

        it('should reject if parameter is not an array', () => {
            const validator = ValidatorBuilder.new().requires('prices').toBeArray().withEachElement().toBeInteger().build();
            let result = validator.validate({ prices: 5 });
            expect(result.valid).to.be.false;
        });

        it('should accept if parameter is an array', () => {
            const validator = ValidatorBuilder.new().requires('prices').toBeArray().withEachElement().toBeInteger().build();
            let result = validator.validate({ prices: [] });
            expect(result.valid).to.be.true;
        });

        it('should accept only if all elements satisfy element validator', () => {
            const validator = ValidatorBuilder.new().requires('prices').toBeArray().withEachElement().toBeInteger().withMinValue(10).build();

            let result = validator.validate({ prices: [10, 20, "Not an integer" ]});
            expect(result.valid).to.be.false;

            result = validator.validate({ prices: [10, 20, 5] });
            expect(result.valid).to.be.false;

            result = validator.validate({ prices: [10, 50, 82] });
            expect(result.valid).to.be.true;
        });

        it('should reject if array length is lower than specified minimum length', () => {
            const validator = ValidatorBuilder.new().requires('prices').toBeArray().withMinLength(5).withEachElement().toBeString().build();
            let result = validator.validate({ prices: ['a', 'b', 'c', 'd']});
            expect(result.valid).to.be.false;
        });

        it('should accept if array length is greater than or equal to specified miminum length', () => {
            const validator = ValidatorBuilder.new().requires('prices').toBeArray().withMinLength(6).withEachElement().toBeString().build();
            let result = validator.validate({ prices: ['a', 'b', 'c', 'd', 'e', 'f', 'g']});
            expect(result.valid).to.be.true;
        });

        it('should reject if array length is greater than specified maximum length', () => {
            const validator = ValidatorBuilder.new().requires('prices').toBeArray().withMaxLength(4).withEachElement().toBeInteger().build();
            let result = validator.validate({ prices: [1, 2, 3, 4, 5] });
            expect(result.valid).to.be.false;
        });

        it('should accept if array length is equal to or lower than specified maximum length', () => {
            const validator = ValidatorBuilder.new().requires('prices').toBeArray().withMaxLength(9).withEachElement().toBeInteger().build();
            let result = validator.validate({ prices: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
            expect(result.valid).to.be.true;
        });

        it('should reject if array length is out of specified bounds', () => {
            const validator = ValidatorBuilder.new().requires('prices').toBeArray().withMinLength(4).withMaxLength(9).withEachElement().toBeInteger().build();
            
            let result = validator.validate({ prices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
            expect(result.valid).to.be.false;

            result = validator.validate({ prices: [1, 2, 3] });
            expect(result.valid).to.be.false;
        });

        it('should accept if array length is in specified bounds', () => {
            const validator = ValidatorBuilder.new().requires('prices').toBeArray().withMinLength(1).withMaxLength(6).withEachElement().toBeInteger().build();
            
            let result = validator.validate({ prices: [1] });
            expect(result.valid).to.be.true;

            result = validator.validate({ prices: [1, 2, 3, 4, 5] });
            expect(result.valid).to.be.true;

            result = validator.validate({ prices: [1, 2, 3, 4, 5, 6] });
            expect(result.valid).to.be.true;
        });

        it('should accept nested arrays and validate it correctly', () => {
            const validator = ValidatorBuilder.new()
                                .requires('matrix').toBeArray().withEachElement()
                                    .toBeArray().withMinLength(2).withEachElement()
                                        .toBeInteger().withMinValue(0)
                                .build();

            let result = validator.validate({ matrix: [
                [0, 1, 2],
                [5, 8, 7]
            ] });
            expect(result.valid).to.be.true;

            result = validator.validate({ matrix: [
                [0, 1, 2],
                [5]
            ] });
            expect(result.valid).to.be.false;

            result = validator.validate({ matrix: [
                [0, 1, 2],
                [5, 8, -8]
            ] });
            expect(result.valid).to.be.false;
        });

    });

});

describe('Validator builder behavior', () => {

    it('should throw if specified string min length is greater than already specified string max length', () => {
        expect(() => ValidatorBuilder.new().optional('test').toBeString().withMaxLength(5).withMinLength(6)).to.throw();
    });

    it('should throw if specified string max length is lower than already specified min length', () => {
        expect(() => ValidatorBuilder.new().optional('test').toBeString().withMinLength(5).withMaxLength(4)).to.throw();
    });

    it('should throw is specified string min length is lower than 0', () => {
        expect(() => ValidatorBuilder.new().optional('test').toBeString().withMinLength(-1)).to.throw();
    });

    it('should throw is specified string max length is lower than 0', () => {
        expect(() => ValidatorBuilder.new().optional('test').toBeString().withMaxLength(-1)).to.throw();
    });

    it('should throw if specified integer min value is greater than already specified integer max value', () => {
        expect(() => ValidatorBuilder.new().optional('test').toBeInteger().withMaxValue(800).withMinValue(801)).to.throw();
    });

    it('should throw if specified integer max value is lower than already specified integer min value', () => {
        expect(() => ValidatorBuilder.new().optional('test').toBeInteger().withMinValue(-20).withMaxValue(-21)).to.throw();
    });

    it('should throw if parameter path has an empty part', () => {
        expect(() => ValidatorBuilder.new().optional('test.')).to.throw();
        expect(() => ValidatorBuilder.new().optional('test..othertest')).to.throw();
        expect(() => ValidatorBuilder.new().optional('.test.other')).to.throw();
        expect(() => ValidatorBuilder.new().optional('   .   .test')).to.throw();
    });

    it('should throw if specified minimum array length is lower than 0', () => {
        expect(() => ValidatorBuilder.new().optional('prices').toBeArray().withMinLength(-1)).to.throw();
    });

    it('should throw if specified maximum array length is lower than 0', () => {
        expect(() => ValidatorBuilder.new().optional('prices').toBeArray().withMaxLength(-1)).to.throw();
    });

    it('should throw if specified minimum array length is greater than already specified array maximum length', () => {
        expect(() => ValidatorBuilder.new().optional('prices').toBeArray().withMaxLength(5).withMinLength(6)).to.throw();
    });

    it('should throw if specified maximum array length is lower than already specified array minimum length', () => {
        expect(() => ValidatorBuilder.new().optional('prices').toBeArray().withMinLength(5).withMaxLength(4)).to.throw();
    });

});