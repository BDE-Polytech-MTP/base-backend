import { BuildStep, IntegerStep, StringStep, TypeStep, ValidationResult, Validator, ArrayStep } from './steps';

/**
 * Finds the value for the data with the given path in the given dictionnary or `undefined` if no data was
 * found.
 * 
 * Example given the following `from`:
 * ```
 * from = {
 *      user: {
 *          name: 'George'
 *      },
 *      event: {
 *          beginning: 64231684
 *      }
 *  }
 * ```
 * With `path = ["user", "name"]`, the result will be `'George'`.
 * 
 * With `path = ["event", "beginning"]`, the result will be `64231684`.
 * 
 * With `path = ["user", "age"]`, the result will be `undefined`.
 * 
 * @param from The dictionnary to find data in
 * @param path The path to the data in the given dictionnary
 * @returns the data associated with the given path, or undefined if no data was found
 */
function extractValue(from: {[key: string]: any}, path: string[]): any {
    let i = 0;

    while (i < path.length - 1 && typeof from === 'object') {
        from = from[path[i]];
        i++;
    }
    
    return i == path.length - 1 && typeof from === 'object' ? from[path[i]] : undefined;
}

function parsePath(path: string): string[] {
    path = path.trim();
    if (path.length === 0) {
        throw new Error("Provided path is empty");
    }
    const pathSteps = path.split('.');
    if (pathSteps.findIndex((value) => value.trim().length === 0) != -1) {
        throw new Error("Provided path contains empty parts.")
    }
    return pathSteps;
}

/**
 * Represents the state of the configuration for the value checker the user is currently creating.
 */
interface ValueConfig {
    /** The user specified value path (dot joined path) */
    fullPath: string,
    /** The computed path, splitted on dots, trimmed, without empty part */
    path: string[],
    /** true if the value is required, false if the value is optional */
    required: boolean;
    /** The current provider for the configured value */
    provider?: ValidationProvider;
}

/**
 * Builder class to create a value validator.
 */
export class ValidatorBuilder<T> implements TypeStep<T>, BuildStep<T> {

    /**
     * All checkers to run against and to satisfy to validate
     */
    private checkers: ((value: any) => void)[] = [];
    private config?: ValueConfig;

    private constructor() {}

    /**
     * Creates a new ValidatorBuilder.
     */
    public static new<T>(): BuildStep<T> {
        return new ValidatorBuilder<T>();
    }
    
    /**
     * Creates the checker function from the current configuration then add it to checkers array.
     */
    private finishCurrent(): void {
        if (!this.config) {
            return;
        }
        
        const currentConfig = this.config;
        const providedValidation = currentConfig.provider!.provide();
        this.checkers.push((body: object | null) => {
            if (body === null) {
                if (currentConfig.required) {
                    throw new Error(`${currentConfig.fullPath} is required, but got an empty body.`);
                } else {
                    return;
                }
            }
            let value = extractValue(body, currentConfig.path);
            if (value === undefined) {
                if (currentConfig.required) {
                    throw new Error(`${currentConfig.fullPath} is required, but it can't be found in body.`);
                } else {
                    return;
                }
            }

            return providedValidation(value, currentConfig.fullPath);
        });
        this.config = undefined;
    }

    toBeString(): StringStep<T> {
        let provider = new StringValidator(this);
        this.config!.provider = provider;
        return provider;
    }

    toBeInteger(): IntegerStep<T> {
        let provider = new IntegerValidator(this);
        this.config!.provider = provider;
        return provider;
    }

    toBeArray(): ArrayStep<T> {
        let provider = new ArrayValidator(this);
        this.config!.provider = provider;
        return provider;
    }

    requires(path: string): TypeStep<T> {
        this.finishCurrent();
        this.config = {
            required: true,
            path: parsePath(path),
            fullPath: path,
        };
        return this;
    }

    optional(path: string): TypeStep<T> {
        this.finishCurrent();
        this.config = {
            required: false,
            path: parsePath(path),
            fullPath: path,
        }
        return this;
    }

    build(): Validator<T> {
        this.finishCurrent();
        const checkers = this.checkers;
        return {
            validate: (body: {[key: string]: any} | null): ValidationResult<T> => {
                try {
                    for (let i = 0; i < checkers.length; i++) {
                        checkers[i](body);
                    }
                    return {
                        valid: true,
                        value: <T><unknown>body,
                    }
                } catch (e) {
                    return {
                        valid: false,
                        error: e
                    }
                }
            }
        }
    }

}

interface ValueChecker {
    (value: any, name: string): void;
}

interface ValidationProvider {
    provide(): ValueChecker;
}

class StringValidator<T> implements StringStep<T>, ValidationProvider {

    private minLength?: number;
    private maxLength?: number;
    private regex?: RegExp;

    constructor(private builder: BuildStep<T>) {}

    provide(): ValueChecker {
        return (value, name) => {
            if (typeof value !== 'string') {
                throw new Error(`Expected ${name} to be a string, but got ${typeof value}.`);
            }

            value = value.trim();

            if (this.minLength !== undefined && value.length < this.minLength) {
                throw new Error(`Expected ${name} to be longer than or equal to ${this.minLength}, but got length of ${value.length}.`);
            }

            if (this.maxLength !== undefined && value.length > this.maxLength) {
                throw new Error(`Expected ${name} to be shorter than or equal to ${this.maxLength}, but got length of ${value.length}.`);
            }

            if (this.regex && !this.regex.test(value)) {
                throw new Error(`Expected ${name} to match ${this.regex.source}, but got value ${value}.`);
            }
        }
    }

    withMinLength(length: number): StringStep<T> {
        if (length < 0) {
            throw new Error('String length can\'t be lower than 0');
        }
        this.minLength = length;
        if (this.maxLength !== undefined && this.maxLength < length) {
            throw new Error(`Specified a min length (${length}) greater than the previously specified max length (${this.maxLength})`);
        }
        return this;
    }

    withMaxLength(length: number): StringStep<T> {
        if (length < 0) {
            throw new Error('String length can\'t be lower than 0');
        }
        this.maxLength = length;
        if (this.minLength !== undefined && length < this.minLength) {
            throw new Error(`Specified a max length (${length}) lower than the previously specified min length (${this.minLength})`);
        }
        return this;
    }
    
    matching(regex: RegExp): StringStep<T> {
        this.regex = regex;
        return this;
    }
    
    build(): Validator<T> {
        return this.builder.build();
    }
    
    requires(path: string): TypeStep<T> {
        return this.builder.requires(path);
    }
    
    optional(path: string): TypeStep<T> {
        return this.builder.optional(path);
    }

}

class IntegerValidator<T> implements IntegerStep<T>, ValidationProvider {

    private minValue?: number;
    private maxValue?: number;

    constructor(private builder: BuildStep<T>) {}

    provide(): ValueChecker {
        return (value, name) => {
            if (typeof value !== 'number') {
                throw new Error(`Expected ${name} to be an integer, but got ${typeof value}.`);
            }

            if (`${value}`.indexOf('.') !== -1) {
                throw new Error(`Expected ${name} to be an integer, but got floating number.`);
            }

            if (this.minValue !== undefined && value < this.minValue) {
                throw new Error(`Expected ${name} to be greater than or equal to ${this.minValue}, but got ${value}.`);
            }

            if (this.maxValue !== undefined && value > this.maxValue) {
                throw new Error(`Expected ${name} to be greater than or equal to ${this.maxValue}, but got ${value}.`);
            }
        }
    }

    withMinValue(value: number): IntegerStep<T> {
        this.minValue = value;
        if (this.maxValue !== undefined && this.maxValue < value) {
            throw new Error(`Specified a min value (${value}) greater than the previously specified max value (${this.maxValue})`);
        }
        return this;
    }

    withMaxValue(value: number): IntegerStep<T> {
        this.maxValue = value;
        if (this.minValue !== undefined && value < this.minValue) {
            throw new Error(`Specified a max value (${value}) lower than the previously specified min value (${this.minValue})`);
        }
        return this;
    }
    
    build(): Validator<T> {
        return this.builder.build();
    }
    
    requires(path: string): TypeStep<T> {
        return this.builder.requires(path);
    }
    
    optional(path: string): TypeStep<T> {
        return this.builder.optional(path);
    }

}

class ArrayValidator<T> implements ArrayStep<T>, ValidationProvider, TypeStep<T>, BuildStep<T> {

    private minLength?: number;
    private maxLength?: number;
    private provider?: ValidationProvider;

    constructor(private builder: BuildStep<T>) {}
    
    withMinLength(length: number): ArrayStep<T> {
        if (length < 0) {
            throw new Error('Array length can\'t be lower than 0');
        }
        this.minLength = length;
        if (this.maxLength !== undefined && this.maxLength < length) {
            throw new Error(`Specified a min length (${length}) greater than the previously specified max length (${this.maxLength})`);
        }
        return this;
    }
    
    withMaxLength(length: number): ArrayStep<T> {
        if (length < 0) {
            throw new Error('Array length can\'t be lower than 0');
        }
        this.maxLength = length;
        if (this.minLength !== undefined && length < this.minLength) {
            throw new Error(`Specified a max length (${length}) lower than the previously specified min length (${this.minLength})`);
        }
        return this;
    }

    withEachElement(): TypeStep<T> {
        return this;
    }

    toBeString(): StringStep<T> {
        let provider = new StringValidator(this);
        this.provider = provider;
        return provider;
    }

    toBeInteger(): IntegerStep<T> {
        let provider = new IntegerValidator(this);
        this.provider = provider;
        return provider;
    }
    
    toBeArray(): ArrayStep<T> {
        let provider = new ArrayValidator(this);
        this.provider = provider;
        return provider;
    }

    build(): Validator<T> {
        return this.builder.build();
    }

    requires(path: string): TypeStep<T> {
        return this.builder.requires(path);
    }

    optional(path: string): TypeStep<T> {
        return this.builder.optional(path);
    }

    provide(): ValueChecker {
        let elementsValidator = this.provider!.provide();

        return (value, name) => {
            if (!(value instanceof Array)) {
                throw new Error(`Expected ${name} to be an array, but got ${typeof value}.`);
            }

            if (this.minLength !== undefined && value.length < this.minLength) {
                throw new Error(`Expected array length to be greater than ${this.minLength} but got ${value.length}`);
            }

            if (this.maxLength !== undefined && value.length > this.maxLength) {
                throw new Error(`Expected array length to be lower than ${this.maxLength} but got ${value.length}`);
            }

            for (let i = 0; i < value.length; i++) {
                elementsValidator(value[i], `${name}.${i}`);
            }
        };
    }

}